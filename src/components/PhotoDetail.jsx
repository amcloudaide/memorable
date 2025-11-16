import React, { useState, useEffect } from 'react';

function PhotoDetail({ photo, collections, onClose, onUpdate, onDelete, onAddToCollection, onRemoveFromCollection }) {
  const [photoData, setPhotoData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [photoCollections, setPhotoCollections] = useState([]);
  const [customMetadata, setCustomMetadata] = useState([]);
  const [newMetadataKey, setNewMetadataKey] = useState('');
  const [newMetadataValue, setNewMetadataValue] = useState('');

  useEffect(() => {
    loadPhotoData();
    loadPhotoCollections();
    loadCustomMetadata();
  }, [photo.id]);

  const loadPhotoData = async () => {
    const data = await window.electron.readPhotoFile(photo.file_path);
    setPhotoData(data);
    setFormData({
      date_taken: photo.date_taken || '',
      latitude: photo.latitude || '',
      longitude: photo.longitude || '',
      rating: photo.rating || 0,
      notes: photo.notes || '',
      camera_make: photo.camera_make || '',
      camera_model: photo.camera_model || '',
      lens_model: photo.lens_model || '',
      focal_length: photo.focal_length || '',
      aperture: photo.aperture || '',
      iso: photo.iso || ''
    });
  };

  const loadPhotoCollections = async () => {
    const cols = await window.electron.getPhotoCollections(photo.id);
    setPhotoCollections(cols);
  };

  const loadCustomMetadata = async () => {
    const metadata = await window.electron.getCustomMetadata(photo.id);
    setCustomMetadata(metadata);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    await onUpdate(photo.id, formData);
    setEditing(false);
  };

  const handleCancel = () => {
    loadPhotoData();
    setEditing(false);
  };

  const handleToggleCollection = async (collectionId) => {
    const isInCollection = photoCollections.some(c => c.id === collectionId);
    if (isInCollection) {
      await onRemoveFromCollection(photo.id, collectionId);
    } else {
      await onAddToCollection(photo.id, collectionId);
    }
    await loadPhotoCollections();
  };

  const handleAddCustomMetadata = async () => {
    if (newMetadataKey && newMetadataValue) {
      await window.electron.setCustomMetadata(photo.id, newMetadataKey, newMetadataValue);
      setNewMetadataKey('');
      setNewMetadataValue('');
      await loadCustomMetadata();
    }
  };

  const handleWriteToExif = async () => {
    if (confirm('This will write the metadata from the database back to the photo file. A backup will be created. Continue?')) {
      const result = await window.electron.writeMetadataToExif(photo.id);
      if (result.success) {
        alert(result.message);
      } else {
        alert('Error: ' + result.message);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="photo-detail" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', width: '1200px' }}>
        <div className="photo-detail-image">
          {photoData ? (
            <img src={photoData} alt={photo.file_name} />
          ) : (
            <div>Loading...</div>
          )}
        </div>

        <div className="photo-detail-sidebar">
          <div className="flex justify-between items-center mb-2">
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{photo.file_name}</h2>
            <button className="secondary small" onClick={onClose}>Close</button>
          </div>

          <div className="detail-section">
            <div className="flex justify-between items-center mb-1">
              <h3>Metadata</h3>
              {!editing ? (
                <button className="small" onClick={() => setEditing(true)}>Edit</button>
              ) : (
                <div className="flex gap-2">
                  <button className="small" onClick={handleSave}>Save</button>
                  <button className="small secondary" onClick={handleCancel}>Cancel</button>
                </div>
              )}
            </div>

            <div className="metadata-grid">
              <div className="metadata-item">
                <label className="metadata-label">Date Taken</label>
                {editing ? (
                  <input
                    type="text"
                    name="date_taken"
                    value={formData.date_taken}
                    onChange={handleInputChange}
                    placeholder="YYYY-MM-DD HH:MM:SS"
                  />
                ) : (
                  <div className="metadata-value">{formatDate(photo.date_taken)}</div>
                )}
              </div>

              <div className="metadata-item">
                <label className="metadata-label">Location</label>
                {editing ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      placeholder="Latitude"
                      step="any"
                    />
                    <input
                      type="number"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      placeholder="Longitude"
                      step="any"
                    />
                  </div>
                ) : (
                  <div className="metadata-value">
                    {photo.latitude && photo.longitude
                      ? `${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}`
                      : 'No location data'}
                  </div>
                )}
              </div>

              <div className="metadata-item">
                <label className="metadata-label">Rating</label>
                {editing ? (
                  <select name="rating" value={formData.rating} onChange={handleInputChange}>
                    <option value="0">No rating</option>
                    <option value="1">⭐</option>
                    <option value="2">⭐⭐</option>
                    <option value="3">⭐⭐⭐</option>
                    <option value="4">⭐⭐⭐⭐</option>
                    <option value="5">⭐⭐⭐⭐⭐</option>
                  </select>
                ) : (
                  <div className="metadata-value">
                    {photo.rating > 0 ? '⭐'.repeat(photo.rating) : 'No rating'}
                  </div>
                )}
              </div>

              <div className="metadata-item">
                <label className="metadata-label">Notes</label>
                {editing ? (
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Add notes..."
                  />
                ) : (
                  <div className="metadata-value">{photo.notes || 'No notes'}</div>
                )}
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Camera Information</h3>
            <div className="metadata-grid">
              {editing ? (
                <>
                  <div className="metadata-item">
                    <label className="metadata-label">Camera</label>
                    <input
                      type="text"
                      name="camera_make"
                      value={formData.camera_make}
                      onChange={handleInputChange}
                      placeholder="Make"
                    />
                    <input
                      type="text"
                      name="camera_model"
                      value={formData.camera_model}
                      onChange={handleInputChange}
                      placeholder="Model"
                      style={{ marginTop: '0.5rem' }}
                    />
                  </div>
                  <div className="metadata-item">
                    <label className="metadata-label">Lens</label>
                    <input
                      type="text"
                      name="lens_model"
                      value={formData.lens_model}
                      onChange={handleInputChange}
                      placeholder="Lens model"
                    />
                  </div>
                  <div className="metadata-item">
                    <label className="metadata-label">Settings</label>
                    <input
                      type="number"
                      name="focal_length"
                      value={formData.focal_length}
                      onChange={handleInputChange}
                      placeholder="Focal length (mm)"
                    />
                    <input
                      type="number"
                      name="aperture"
                      value={formData.aperture}
                      onChange={handleInputChange}
                      placeholder="Aperture (f-stop)"
                      style={{ marginTop: '0.5rem' }}
                      step="0.1"
                    />
                    <input
                      type="number"
                      name="iso"
                      value={formData.iso}
                      onChange={handleInputChange}
                      placeholder="ISO"
                      style={{ marginTop: '0.5rem' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="metadata-item">
                    <label className="metadata-label">Camera</label>
                    <div className="metadata-value">
                      {photo.camera_make || photo.camera_model
                        ? `${photo.camera_make || ''} ${photo.camera_model || ''}`.trim()
                        : 'Unknown'}
                    </div>
                  </div>
                  <div className="metadata-item">
                    <label className="metadata-label">Lens</label>
                    <div className="metadata-value">{photo.lens_model || 'Unknown'}</div>
                  </div>
                  <div className="metadata-item">
                    <label className="metadata-label">Focal Length</label>
                    <div className="metadata-value">
                      {photo.focal_length ? `${photo.focal_length}mm` : 'Unknown'}
                    </div>
                  </div>
                  <div className="metadata-item">
                    <label className="metadata-label">Aperture</label>
                    <div className="metadata-value">
                      {photo.aperture ? `f/${photo.aperture}` : 'Unknown'}
                    </div>
                  </div>
                  <div className="metadata-item">
                    <label className="metadata-label">ISO</label>
                    <div className="metadata-value">{photo.iso || 'Unknown'}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3>File Information</h3>
            <div className="metadata-grid">
              <div className="metadata-item">
                <label className="metadata-label">Dimensions</label>
                <div className="metadata-value">
                  {photo.width && photo.height ? `${photo.width} × ${photo.height}` : 'Unknown'}
                </div>
              </div>
              <div className="metadata-item">
                <label className="metadata-label">File Size</label>
                <div className="metadata-value">{formatFileSize(photo.file_size)}</div>
              </div>
              <div className="metadata-item">
                <label className="metadata-label">File Path</label>
                <div className="metadata-value" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {photo.file_path}
                </div>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Collections</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {collections.map(collection => {
                const isInCollection = photoCollections.some(c => c.id === collection.id);
                return (
                  <label key={collection.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={isInCollection}
                      onChange={() => handleToggleCollection(collection.id)}
                    />
                    <span>{collection.name}</span>
                  </label>
                );
              })}
              {collections.length === 0 && (
                <div className="metadata-value">No collections yet</div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3>Custom Metadata</h3>
            <div className="metadata-grid mb-2">
              {customMetadata.map((meta, idx) => (
                <div key={idx} className="metadata-item">
                  <label className="metadata-label">{meta.key}</label>
                  <div className="metadata-value">{meta.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="text"
                placeholder="Key"
                value={newMetadataKey}
                onChange={(e) => setNewMetadataKey(e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                type="text"
                placeholder="Value"
                value={newMetadataValue}
                onChange={(e) => setNewMetadataValue(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="small" onClick={handleAddCustomMetadata}>Add</button>
            </div>
          </div>

          <div className="detail-section">
            <h3>Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={handleWriteToExif} style={{ width: '100%' }}>
                Write Metadata to EXIF
              </button>
              <button className="danger" onClick={() => onDelete(photo.id)} style={{ width: '100%' }}>
                Delete from Database
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhotoDetail;
