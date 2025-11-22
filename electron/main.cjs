const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const initSqlJs = require('sql.js');
const exifr = require('exifr');
const piexif = require('piexifjs');

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
    'aperture', 'shutter_speed', 'iso'
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
