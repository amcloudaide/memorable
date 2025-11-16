import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapView({ photos, onPhotoClick }) {
  const [photoThumbnails, setPhotoThumbnails] = useState({});

  useEffect(() => {
    // Load thumbnails for photos with location
    photos.forEach(async (photo) => {
      if (!photoThumbnails[photo.id]) {
        const thumbnail = await window.electron.readPhotoFile(photo.file_path);
        setPhotoThumbnails(prev => ({ ...prev, [photo.id]: thumbnail }));
      }
    });
  }, [photos]);

  if (photos.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🗺️</div>
        <div className="empty-state-text">No photos with location data</div>
        <div className="empty-state-subtext">
          Import photos with GPS coordinates to see them on the map
        </div>
      </div>
    );
  }

  // Calculate center of all photos
  const center = photos.length > 0
    ? [
        photos.reduce((sum, p) => sum + p.latitude, 0) / photos.length,
        photos.reduce((sum, p) => sum + p.longitude, 0) / photos.length
      ]
    : [0, 0];

  return (
    <div className="map-container">
      <MapContainer
        center={center}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {photos.map((photo) => (
          <Marker
            key={photo.id}
            position={[photo.latitude, photo.longitude]}
          >
            <Popup>
              <div style={{ textAlign: 'center' }}>
                {photoThumbnails[photo.id] && (
                  <img
                    src={photoThumbnails[photo.id]}
                    alt={photo.file_name}
                    style={{ width: '200px', height: '150px', objectFit: 'cover', marginBottom: '0.5rem', cursor: 'pointer' }}
                    onClick={() => onPhotoClick(photo)}
                  />
                )}
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{photo.file_name}</div>
                {photo.date_taken && (
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {new Date(photo.date_taken).toLocaleDateString()}
                  </div>
                )}
                {photo.camera_model && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {photo.camera_model}
                  </div>
                )}
                <button
                  onClick={() => onPhotoClick(photo)}
                  style={{ marginTop: '0.5rem', width: '100%' }}
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default MapView;
