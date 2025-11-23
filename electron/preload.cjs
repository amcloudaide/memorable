const { contextBridge, ipcRenderer, clipboard } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Photo operations
  selectPhotos: () => ipcRenderer.invoke('select-photos'),
  getPhotos: () => ipcRenderer.invoke('get-photos'),
  getPhoto: (id) => ipcRenderer.invoke('get-photo', id),
  updatePhoto: (id, updates) => ipcRenderer.invoke('update-photo', id, updates),
  deletePhoto: (id) => ipcRenderer.invoke('delete-photo', id),
  deletePhotos: (ids) => ipcRenderer.invoke('delete-photos', ids),
  updatePhotosLocation: (ids, locationData) => ipcRenderer.invoke('update-photos-location', ids, locationData),
  readPhotoFile: (filePath) => ipcRenderer.invoke('read-photo-file', filePath),

  // Collection operations
  createCollection: (name, description) => ipcRenderer.invoke('create-collection', name, description),
  getCollections: () => ipcRenderer.invoke('get-collections'),
  updateCollection: (id, name, description) => ipcRenderer.invoke('update-collection', id, name, description),
  deleteCollection: (id) => ipcRenderer.invoke('delete-collection', id),
  addPhotoToCollection: (photoId, collectionId) => ipcRenderer.invoke('add-photo-to-collection', photoId, collectionId),
  addPhotosToCollection: (photoIds, collectionId) => ipcRenderer.invoke('add-photos-to-collection', photoIds, collectionId),
  removePhotoFromCollection: (photoId, collectionId) => ipcRenderer.invoke('remove-photo-from-collection', photoId, collectionId),
  removePhotosFromCollection: (photoIds, collectionId) => ipcRenderer.invoke('remove-photos-from-collection', photoIds, collectionId),
  getCollectionPhotos: (collectionId) => ipcRenderer.invoke('get-collection-photos', collectionId),
  getPhotoCollections: (photoId) => ipcRenderer.invoke('get-photo-collections', photoId),

  // Custom metadata
  setCustomMetadata: (photoId, key, value) => ipcRenderer.invoke('set-custom-metadata', photoId, key, value),
  getCustomMetadata: (photoId) => ipcRenderer.invoke('get-custom-metadata', photoId),

  // Location (places) operations
  createLocation: (locationData) => ipcRenderer.invoke('create-location', locationData),
  getLocations: () => ipcRenderer.invoke('get-locations'),
  getLocation: (id) => ipcRenderer.invoke('get-location', id),
  updateLocation: (id, updates) => ipcRenderer.invoke('update-location', id, updates),
  deleteLocation: (id) => ipcRenderer.invoke('delete-location', id),

  // EXIF operations
  writeMetadataToExif: (photoId) => ipcRenderer.invoke('write-metadata-to-exif', photoId),

  // Location operations
  reverseGeocode: (latitude, longitude) => ipcRenderer.invoke('reverse-geocode', latitude, longitude),
  searchNearbyPlaces: (latitude, longitude, radius) => ipcRenderer.invoke('search-nearby-places', latitude, longitude, radius),
  openInMaps: (latitude, longitude) => ipcRenderer.invoke('open-in-maps', latitude, longitude),

  // Clipboard operations
  readClipboard: () => clipboard.readText(),

  // WordPress operations
  wpSaveSettings: (settings) => ipcRenderer.invoke('wp-save-settings', settings),
  wpGetSettings: () => ipcRenderer.invoke('wp-get-settings'),
  wpTestConnection: () => ipcRenderer.invoke('wp-test-connection'),
  wpGetCategories: () => ipcRenderer.invoke('wp-get-categories'),
  wpGetTags: () => ipcRenderer.invoke('wp-get-tags'),
  wpCreateTag: (name) => ipcRenderer.invoke('wp-create-tag', name),
  wpUploadMedia: (filePath, description) => ipcRenderer.invoke('wp-upload-media', filePath, description),
  wpCreatePost: (postData) => ipcRenderer.invoke('wp-create-post', postData)
});
