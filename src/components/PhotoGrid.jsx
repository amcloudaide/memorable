import React, { useState, useEffect } from 'react';

function PhotoGrid({ photos, onPhotoClick, selectedCollection }) {
  const [photoThumbnails, setPhotoThumbnails] = useState({});
  const [displayPhotos, setDisplayPhotos] = useState([]);

  useEffect(() => {
    if (selectedCollection) {
      loadCollectionPhotos();
    } else {
      setDisplayPhotos(photos);
    }
  }, [photos, selectedCollection]);

  const loadCollectionPhotos = async () => {
    try {
      const collectionPhotos = await window.electron.getCollectionPhotos(selectedCollection);
      setDisplayPhotos(collectionPhotos);
    } catch (error) {
      console.error('Error loading collection photos:', error);
    }
  };

  useEffect(() => {
    // Load thumbnails for visible photos
    displayPhotos.forEach(async (photo) => {
      if (!photoThumbnails[photo.id]) {
        const thumbnail = await window.electron.readPhotoFile(photo.file_path);
        setPhotoThumbnails(prev => ({ ...prev, [photo.id]: thumbnail }));
      }
    });
  }, [displayPhotos]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  if (displayPhotos.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📷</div>
        <div className="empty-state-text">No photos yet</div>
        <div className="empty-state-subtext">
          {selectedCollection
            ? 'This collection is empty. Add some photos!'
            : 'Click "Import Photos" to get started'}
        </div>
      </div>
    );
  }

  return (
    <div className="photo-grid">
      {displayPhotos.map((photo) => (
        <div
          key={photo.id}
          className="photo-card"
          onClick={() => onPhotoClick(photo)}
        >
          {photoThumbnails[photo.id] ? (
            <img src={photoThumbnails[photo.id]} alt={photo.file_name} />
          ) : (
            <div style={{ height: '200px', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Loading...
            </div>
          )}
          <div className="photo-card-info">
            <div className="photo-card-title">{photo.file_name}</div>
            <div className="photo-card-meta">
              {formatDate(photo.date_taken)}
              {photo.camera_model && ` • ${photo.camera_model}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default PhotoGrid;
