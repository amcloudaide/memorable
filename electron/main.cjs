const { app, BrowserWindow, ipcMain, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const initSqlJs = require('sql.js');
const exifr = require('exifr');
const piexif = require('piexifjs');

// Helper function to make HTTP requests
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const request = net.request(url);
    let data = '';

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        data += chunk.toString();
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.setHeader('User-Agent', 'Memorable Photo App/1.0');
    request.end();
  });
}

let mainWindow;
let db;
let dbPath;

// Initialize database
async function initDatabase() {
  dbPath = path.join(app.getPath('userData'), 'memorable.db');
  const SQL = await initSqlJs();

  // Load existing database or create new one
  let buffer;
  try {
    buffer = fsSync.readFileSync(dbPath);
  } catch (e) {
    // Database doesn't exist yet
    buffer = null;
  }

  db = new SQL.Database(buffer);

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT UNIQUE NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      import_date TEXT DEFAULT CURRENT_TIMESTAMP,
      date_taken TEXT,
      latitude REAL,
      longitude REAL,
      camera_make TEXT,
      camera_model TEXT,
      lens_model TEXT,
      focal_length REAL,
      aperture REAL,
      shutter_speed TEXT,
      iso INTEGER,
      width INTEGER,
      height INTEGER,
      orientation INTEGER,
      rating INTEGER DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_date TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS photo_collections (
      photo_id INTEGER,
      collection_id INTEGER,
      added_date TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (photo_id, collection_id),
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_id INTEGER,
      key TEXT NOT NULL,
      value TEXT,
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_photos_location ON photos(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_photos_date ON photos(date_taken);
  `);

  // Add location_name column if it doesn't exist (migration for existing databases)
  try {
    db.run('ALTER TABLE photos ADD COLUMN location_name TEXT');
  } catch (e) {
    // Column already exists, ignore
  }

  saveDatabase();
}

// Helper function to save database to file
function saveDatabase() {
  if (db && dbPath) {
    const data = db.export();
    fsSync.writeFileSync(dbPath, data);
  }
}

// Helper function to convert sql.js results to objects
function sqlResultToObjects(result) {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  const values = result[0].values;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

// Helper function to get a single row
function sqlResultToObject(result) {
  const objects = sqlResultToObjects(result);
  return objects.length > 0 ? objects[0] : null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Load the app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      saveDatabase();
      db.close();
    }
    app.quit();
  }
});

// IPC Handlers

// Select and import photos
ipcMain.handle('select-photos', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', 'heic'] }
    ]
  });

  if (result.canceled) return [];

  const photos = [];
  for (const filePath of result.filePaths) {
    try {
      const photo = await importPhoto(filePath);
      photos.push(photo);
    } catch (error) {
      console.error(`Error importing ${filePath}:`, error);
    }
  }

  return photos;
});

async function importPhoto(filePath) {
  const stats = await fs.stat(filePath);
  const fileName = path.basename(filePath);

  // Read EXIF data
  const exifData = await exifr.parse(filePath, {
    gps: true,
    exif: true,
    iptc: true,
    icc: true,
    jfif: true
  });

  // Convert date to ISO string if it's a Date object
  let dateTaken = exifData?.DateTimeOriginal || exifData?.DateTime || null;
  if (dateTaken instanceof Date) {
    dateTaken = dateTaken.toISOString();
  }

  const photoData = {
    file_path: filePath,
    file_name: fileName,
    file_size: stats.size,
    date_taken: dateTaken,
    latitude: exifData?.latitude || null,
    longitude: exifData?.longitude || null,
    camera_make: exifData?.Make || null,
    camera_model: exifData?.Model || null,
    lens_model: exifData?.LensModel || null,
    focal_length: exifData?.FocalLength || null,
    aperture: exifData?.FNumber || null,
    shutter_speed: exifData?.ExposureTime || null,
    iso: exifData?.ISO || null,
    width: exifData?.ImageWidth || null,
    height: exifData?.ImageHeight || null,
    orientation: exifData?.Orientation || null
  };

  // Insert into database
  db.run(`
    INSERT OR REPLACE INTO photos (
      file_path, file_name, file_size, date_taken, latitude, longitude,
      camera_make, camera_model, lens_model, focal_length, aperture,
      shutter_speed, iso, width, height, orientation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    photoData.file_path,
    photoData.file_name,
    photoData.file_size,
    photoData.date_taken,
    photoData.latitude,
    photoData.longitude,
    photoData.camera_make,
    photoData.camera_model,
    photoData.lens_model,
    photoData.focal_length,
    photoData.aperture,
    photoData.shutter_speed,
    photoData.iso,
    photoData.width,
    photoData.height,
    photoData.orientation
  ]);

  // Get the last inserted ID
  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0];

  saveDatabase();
  return { id, ...photoData };
}

// Get all photos
ipcMain.handle('get-photos', () => {
  const result = db.exec('SELECT * FROM photos ORDER BY date_taken DESC, import_date DESC');
  return sqlResultToObjects(result);
});

// Get photo by ID
ipcMain.handle('get-photo', (event, id) => {
  const result = db.exec('SELECT * FROM photos WHERE id = ?', [id]);
  return sqlResultToObject(result);
});

// Update photo metadata
ipcMain.handle('update-photo', (event, id, updates) => {
  const allowedFields = [
    'date_taken', 'latitude', 'longitude', 'rating', 'notes',
    'camera_make', 'camera_model', 'lens_model', 'focal_length',
    'aperture', 'shutter_speed', 'iso', 'location_name'
  ];

  const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
  if (fields.length === 0) return false;

  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const values = fields.map(field => updates[field]);

  db.run(`UPDATE photos SET ${setClause} WHERE id = ?`, [...values, id]);
  saveDatabase();

  return true;
});

// Delete photo
ipcMain.handle('delete-photo', (event, id) => {
  db.run('DELETE FROM photos WHERE id = ?', [id]);
  saveDatabase();
  return true;
});

// Bulk delete photos
ipcMain.handle('delete-photos', (event, ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return false;
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM photos WHERE id IN (${placeholders})`, ids);
  saveDatabase();
  return true;
});

// Bulk update photos location
ipcMain.handle('update-photos-location', (event, ids, locationData) => {
  if (!Array.isArray(ids) || ids.length === 0) return false;

  const { latitude, longitude, location_name } = locationData;
  const placeholders = ids.map(() => '?').join(',');

  db.run(`UPDATE photos SET latitude = ?, longitude = ?, location_name = ? WHERE id IN (${placeholders})`,
    [latitude, longitude, location_name, ...ids]);
  saveDatabase();
  return true;
});

// Collections
ipcMain.handle('create-collection', (event, name, description) => {
  db.run('INSERT INTO collections (name, description) VALUES (?, ?)', [name, description]);
  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0];
  saveDatabase();
  return { id, name, description };
});

ipcMain.handle('get-collections', () => {
  const result = db.exec('SELECT * FROM collections ORDER BY name');
  return sqlResultToObjects(result);
});

ipcMain.handle('update-collection', (event, id, name, description) => {
  db.run('UPDATE collections SET name = ?, description = ? WHERE id = ?', [name, description, id]);
  saveDatabase();
  return true;
});

ipcMain.handle('delete-collection', (event, id) => {
  db.run('DELETE FROM collections WHERE id = ?', [id]);
  saveDatabase();
  return true;
});

// Add photo to collection
ipcMain.handle('add-photo-to-collection', (event, photoId, collectionId) => {
  db.run('INSERT OR IGNORE INTO photo_collections (photo_id, collection_id) VALUES (?, ?)', [photoId, collectionId]);
  saveDatabase();
  return true;
});

// Bulk add photos to collection
ipcMain.handle('add-photos-to-collection', (event, photoIds, collectionId) => {
  if (!Array.isArray(photoIds) || photoIds.length === 0) return false;
  photoIds.forEach(photoId => {
    db.run('INSERT OR IGNORE INTO photo_collections (photo_id, collection_id) VALUES (?, ?)', [photoId, collectionId]);
  });
  saveDatabase();
  return true;
});

// Bulk remove photos from collection
ipcMain.handle('remove-photos-from-collection', (event, photoIds, collectionId) => {
  if (!Array.isArray(photoIds) || photoIds.length === 0) return false;
  const placeholders = photoIds.map(() => '?').join(',');
  db.run(`DELETE FROM photo_collections WHERE photo_id IN (${placeholders}) AND collection_id = ?`, [...photoIds, collectionId]);
  saveDatabase();
  return true;
});

// Remove photo from collection
ipcMain.handle('remove-photo-from-collection', (event, photoId, collectionId) => {
  db.run('DELETE FROM photo_collections WHERE photo_id = ? AND collection_id = ?', [photoId, collectionId]);
  saveDatabase();
  return true;
});

// Get photos in collection
ipcMain.handle('get-collection-photos', (event, collectionId) => {
  const result = db.exec(`
    SELECT p.* FROM photos p
    JOIN photo_collections pc ON p.id = pc.photo_id
    WHERE pc.collection_id = ?
    ORDER BY pc.added_date DESC
  `, [collectionId]);
  return sqlResultToObjects(result);
});

// Get collections for a photo
ipcMain.handle('get-photo-collections', (event, photoId) => {
  const result = db.exec(`
    SELECT c.* FROM collections c
    JOIN photo_collections pc ON c.id = pc.collection_id
    WHERE pc.photo_id = ?
  `, [photoId]);
  return sqlResultToObjects(result);
});

// Custom metadata
ipcMain.handle('set-custom-metadata', (event, photoId, key, value) => {
  // First try to delete existing, then insert (since ON CONFLICT syntax varies)
  db.run('DELETE FROM custom_metadata WHERE photo_id = ? AND key = ?', [photoId, key]);
  db.run('INSERT INTO custom_metadata (photo_id, key, value) VALUES (?, ?, ?)', [photoId, key, value]);
  saveDatabase();
  return true;
});

ipcMain.handle('get-custom-metadata', (event, photoId) => {
  const result = db.exec('SELECT key, value FROM custom_metadata WHERE photo_id = ?', [photoId]);
  return sqlResultToObjects(result);
});

// Read file as base64 for display
ipcMain.handle('read-photo-file', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath);
    return `data:image/jpeg;base64,${data.toString('base64')}`;
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
});

// Write metadata to EXIF
ipcMain.handle('write-metadata-to-exif', async (event, photoId) => {
  try {
    // Get photo from database
    const result = db.exec('SELECT * FROM photos WHERE id = ?', [photoId]);
    const photo = sqlResultToObject(result);

    if (!photo || !photo.file_path) {
      throw new Error('Photo not found');
    }

    // Check if file is JPEG (piexifjs only supports JPEG)
    const ext = path.extname(photo.file_path).toLowerCase();
    if (!['.jpg', '.jpeg'].includes(ext)) {
      throw new Error('EXIF writing is only supported for JPEG files');
    }

    // Read the image file
    const imageData = fsSync.readFileSync(photo.file_path).toString('binary');

    // Try to load existing EXIF data, or create new
    let exifObj;
    try {
      exifObj = piexif.load(imageData);
    } catch (e) {
      // If no EXIF data exists, create a new object
      exifObj = { '0th': {}, 'Exif': {}, 'GPS': {}, 'Interop': {}, '1st': {}, 'thumbnail': null };
    }

    // Update EXIF fields from database
    if (photo.camera_make) {
      exifObj['0th'][piexif.ImageIFD.Make] = photo.camera_make;
    }
    if (photo.camera_model) {
      exifObj['0th'][piexif.ImageIFD.Model] = photo.camera_model;
    }
    if (photo.date_taken) {
      // Format: "YYYY:MM:DD HH:MM:SS"
      const dateStr = new Date(photo.date_taken).toISOString().replace('T', ' ').substring(0, 19).replace(/-/g, ':');
      exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal] = dateStr;
      exifObj['0th'][piexif.ImageIFD.DateTime] = dateStr;
    }
    if (photo.iso) {
      exifObj['Exif'][piexif.ExifIFD.ISOSpeedRatings] = photo.iso;
    }
    if (photo.focal_length) {
      // Focal length is stored as a rational number [numerator, denominator]
      exifObj['Exif'][piexif.ExifIFD.FocalLength] = [Math.round(photo.focal_length * 1), 1];
    }
    if (photo.aperture) {
      // F-number is stored as a rational number
      exifObj['Exif'][piexif.ExifIFD.FNumber] = [Math.round(photo.aperture * 10), 10];
    }
    if (photo.lens_model) {
      exifObj['Exif'][piexif.ExifIFD.LensModel] = photo.lens_model;
    }

    // GPS data
    if (photo.latitude !== null && photo.longitude !== null) {
      // Helper function to convert decimal degrees to degrees, minutes, seconds
      function toDegreesMinutesSeconds(coordinate) {
        const absolute = Math.abs(coordinate);
        const degrees = Math.floor(absolute);
        const minutesNotTruncated = (absolute - degrees) * 60;
        const minutes = Math.floor(minutesNotTruncated);
        const seconds = Math.floor((minutesNotTruncated - minutes) * 60 * 100);

        return [[degrees, 1], [minutes, 1], [seconds, 100]];
      }

      exifObj['GPS'][piexif.GPSIFD.GPSLatitude] = toDegreesMinutesSeconds(photo.latitude);
      exifObj['GPS'][piexif.GPSIFD.GPSLatitudeRef] = photo.latitude >= 0 ? 'N' : 'S';
      exifObj['GPS'][piexif.GPSIFD.GPSLongitude] = toDegreesMinutesSeconds(photo.longitude);
      exifObj['GPS'][piexif.GPSIFD.GPSLongitudeRef] = photo.longitude >= 0 ? 'E' : 'W';
    }

    // Add user comment with rating and notes
    if (photo.rating || photo.notes) {
      const userComment = [];
      if (photo.rating) {
        userComment.push(`Rating: ${'★'.repeat(photo.rating)}`);
      }
      if (photo.notes) {
        userComment.push(photo.notes);
      }
      exifObj['Exif'][piexif.ExifIFD.UserComment] = userComment.join(' | ');
    }

    // Convert EXIF object to bytes
    const exifBytes = piexif.dump(exifObj);

    // Insert EXIF into image
    const newImageData = piexif.insert(exifBytes, imageData);

    // Create backup
    const backupPath = photo.file_path + '.backup';
    fsSync.copyFileSync(photo.file_path, backupPath);

    // Write the new image
    const buffer = Buffer.from(newImageData, 'binary');
    fsSync.writeFileSync(photo.file_path, buffer);

    return { success: true, message: 'Metadata written to EXIF successfully. Backup created.' };
  } catch (error) {
    console.error('Error writing EXIF:', error);
    return { success: false, message: error.message };
  }
});

// Reverse geocoding - get address from coordinates
ipcMain.handle('reverse-geocode', async (event, latitude, longitude) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const result = await fetchUrl(url);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      address: result.display_name,
      details: result.address,
      type: result.type,
      name: result.name
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return { success: false, error: error.message };
  }
});

// Search nearby places using Overpass API
ipcMain.handle('search-nearby-places', async (event, latitude, longitude, radius = 100) => {
  try {
    // Search for various POI types within radius (in meters)
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"~"restaurant|cafe|bar|fast_food|pub"](around:${radius},${latitude},${longitude});
        node["tourism"~"attraction|museum|hotel|viewpoint|artwork"](around:${radius},${latitude},${longitude});
        node["historic"](around:${radius},${latitude},${longitude});
        node["leisure"~"park|garden|playground"](around:${radius},${latitude},${longitude});
        node["shop"](around:${radius},${latitude},${longitude});
        node["name"](around:${radius},${latitude},${longitude});
        way["name"]["building"](around:${radius},${latitude},${longitude});
      );
      out body center;
    `;

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
    const result = await fetchUrl(url);

    if (!result.elements) {
      return { success: true, places: [] };
    }

    // Process and dedupe results
    const places = result.elements
      .filter(el => el.tags && el.tags.name)
      .map(el => ({
        id: el.id,
        name: el.tags.name,
        type: el.tags.amenity || el.tags.tourism || el.tags.historic || el.tags.leisure || el.tags.shop || 'place',
        category: getCategoryFromTags(el.tags),
        lat: el.lat || el.center?.lat,
        lon: el.lon || el.center?.lon,
        address: el.tags['addr:street'] ? `${el.tags['addr:housenumber'] || ''} ${el.tags['addr:street']}`.trim() : null,
        distance: calculateDistance(latitude, longitude, el.lat || el.center?.lat, el.lon || el.center?.lon)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20); // Limit to 20 results

    return { success: true, places };
  } catch (error) {
    console.error('Nearby places search error:', error);
    return { success: false, error: error.message };
  }
});

// Helper function to categorize places
function getCategoryFromTags(tags) {
  if (tags.amenity) {
    const foodTypes = ['restaurant', 'cafe', 'bar', 'fast_food', 'pub', 'food_court'];
    if (foodTypes.includes(tags.amenity)) return 'Food & Drink';
    return 'Amenity';
  }
  if (tags.tourism) return 'Tourism';
  if (tags.historic) return 'Historic';
  if (tags.leisure) return 'Leisure';
  if (tags.shop) return 'Shop';
  return 'Place';
}

// Calculate distance between two coordinates in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat2 || !lon2) return Infinity;
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return Math.round(R * c);
}

// Open location in Google Maps
ipcMain.handle('open-in-maps', async (event, latitude, longitude) => {
  const { shell } = require('electron');
  const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  await shell.openExternal(url);
  return true;
});

// ==================== WordPress Integration ====================

// Store for WordPress settings
let wpSettings = null;
const wpSettingsPath = () => path.join(app.getPath('userData'), 'wp-settings.json');

// Load WordPress settings
function loadWpSettings() {
  try {
    const data = fsSync.readFileSync(wpSettingsPath(), 'utf8');
    wpSettings = JSON.parse(data);
  } catch (e) {
    wpSettings = null;
  }
  return wpSettings;
}

// Save WordPress settings
ipcMain.handle('wp-save-settings', async (event, settings) => {
  try {
    wpSettings = settings;
    fsSync.writeFileSync(wpSettingsPath(), JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get WordPress settings
ipcMain.handle('wp-get-settings', async () => {
  if (!wpSettings) loadWpSettings();
  return wpSettings || { url: '', username: '', appPassword: '' };
});

// Helper function for WordPress API requests
async function wpApiRequest(endpoint, method = 'GET', body = null, isFormData = false) {
  if (!wpSettings) loadWpSettings();
  if (!wpSettings || !wpSettings.url || !wpSettings.username || !wpSettings.appPassword) {
    throw new Error('WordPress settings not configured');
  }

  const url = `${wpSettings.url.replace(/\/$/, '')}/wp-json/wp/v2${endpoint}`;
  const auth = Buffer.from(`${wpSettings.username}:${wpSettings.appPassword}`).toString('base64');

  return new Promise((resolve, reject) => {
    const request = net.request({
      method,
      url,
    });

    request.setHeader('Authorization', `Basic ${auth}`);

    if (body && !isFormData) {
      request.setHeader('Content-Type', 'application/json');
    }

    let responseData = Buffer.alloc(0);

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        responseData = Buffer.concat([responseData, chunk]);
      });
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData.toString());
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(jsonData.message || `HTTP ${response.statusCode}`));
          }
        } catch (e) {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(responseData.toString());
          } else {
            reject(new Error(`HTTP ${response.statusCode}: ${responseData.toString()}`));
          }
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    if (body && !isFormData) {
      request.write(JSON.stringify(body));
    } else if (body && isFormData) {
      request.write(body);
    }

    request.end();
  });
}

// Test WordPress connection
ipcMain.handle('wp-test-connection', async () => {
  try {
    const result = await wpApiRequest('/users/me');
    return { success: true, user: result.name };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get WordPress categories
ipcMain.handle('wp-get-categories', async () => {
  try {
    const categories = await wpApiRequest('/categories?per_page=100');
    return { success: true, categories };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get WordPress tags
ipcMain.handle('wp-get-tags', async () => {
  try {
    const tags = await wpApiRequest('/tags?per_page=100');
    return { success: true, tags };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Create or get tag by name
ipcMain.handle('wp-create-tag', async (event, name) => {
  try {
    const tag = await wpApiRequest('/tags', 'POST', { name });
    return { success: true, tag };
  } catch (error) {
    // Tag might already exist, try to find it
    if (error.message.includes('term_exists')) {
      const tags = await wpApiRequest(`/tags?search=${encodeURIComponent(name)}`);
      const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
      if (existing) return { success: true, tag: existing };
    }
    return { success: false, error: error.message };
  }
});

// Upload media to WordPress
ipcMain.handle('wp-upload-media', async (event, filePath, mediaInfo = {}) => {
  try {
    if (!wpSettings) loadWpSettings();
    if (!wpSettings) throw new Error('WordPress settings not configured');

    const fileName = path.basename(filePath);
    const fileData = fsSync.readFileSync(filePath);
    const mimeType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    const url = `${wpSettings.url.replace(/\/$/, '')}/wp-json/wp/v2/media`;
    const auth = Buffer.from(`${wpSettings.username}:${wpSettings.appPassword}`).toString('base64');

    return new Promise((resolve, reject) => {
      const request = net.request({
        method: 'POST',
        url,
      });

      request.setHeader('Authorization', `Basic ${auth}`);
      request.setHeader('Content-Type', mimeType);
      request.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      let responseData = Buffer.alloc(0);

      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData = Buffer.concat([responseData, chunk]);
        });
        response.on('end', async () => {
          try {
            const media = JSON.parse(responseData.toString());
            if (response.statusCode >= 200 && response.statusCode < 300) {
              // Update media with proper fields:
              // - caption: photo date
              // - description: location info
              // - alt_text: empty
              try {
                const updateData = {
                  alt_text: ''  // Always empty
                };

                // Caption = date taken
                if (mediaInfo.dateTaken) {
                  try {
                    const date = new Date(mediaInfo.dateTaken);
                    updateData.caption = date.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                  } catch (e) {
                    updateData.caption = '';
                  }
                }

                // Description = location info
                if (mediaInfo.description) {
                  updateData.description = mediaInfo.description;
                }

                await wpApiRequest(`/media/${media.id}`, 'POST', updateData);
              } catch (e) {
                console.error('Failed to update media fields:', e);
              }
              resolve({ success: true, media });
            } else {
              reject(new Error(media.message || `HTTP ${response.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Upload failed: ${responseData.toString()}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.write(fileData);
      request.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Create WordPress post with gallery
ipcMain.handle('wp-create-post', async (event, postData) => {
  try {
    const { title, content, categoryIds, tagIds, mediaItems, featuredImageId, status, customFields } = postData;

    // Build Gutenberg Image blocks (individual linked images like user's existing posts)
    let imageBlocks = '';
    if (mediaItems && mediaItems.length > 0) {
      imageBlocks = mediaItems.map(media => {
        // Use large size for display, link to full size
        const displayUrl = media.largeUrl || media.url;
        const linkUrl = media.fullUrl || media.url;
        return `<!-- wp:image {"id":${media.id},"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="${linkUrl}"><img src="${displayUrl}" alt="" class="wp-image-${media.id}"/></a></figure>
<!-- /wp:image -->`;
      }).join('\n\n');
    }

    const fullContent = content + '\n\n' + imageBlocks;

    // Create the post
    const postBody = {
      title,
      content: fullContent,
      status: status || 'draft',
      categories: categoryIds || [],
      tags: tagIds || []
    };

    if (featuredImageId) {
      postBody.featured_media = featuredImageId;
    }

    const post = await wpApiRequest('/posts', 'POST', postBody);

    // Update custom fields using Smart Custom Fields format
    // SCF stores fields in post meta
    if (customFields && (customFields.lat || customFields.lon)) {
      try {
        // Use the WordPress meta endpoint
        const metaBody = {};
        if (customFields.lat) metaBody['lat'] = customFields.lat.toString();
        if (customFields.lon) metaBody['lon'] = customFields.lon.toString();

        await wpApiRequest(`/posts/${post.id}`, 'POST', { meta: metaBody });
      } catch (e) {
        console.error('Failed to set custom fields:', e);
      }
    }

    return { success: true, post };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
