import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';

// Component to update map center when location changes
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
}

function LocationDetail({ location, onClose, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        latitude: location.latitude?.toString() || '',
        longitude: location.longitude?.toString() || '',
        address: location.address || '',
        category: location.category || '',
        rating: location.rating || 0,
        notes: location.notes || ''
      });
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    await onUpdate(location.id, {
      ...formData,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      rating: parseInt(formData.rating) || 0
    });
    setIsEditing(false);
  };

  const handlePasteCoordinates = async () => {
    try {
      const text = await window.electron.readClipboard();
      const coordMatch = text.match(/@?(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
      if (coordMatch) {
        setFormData(prev => ({
          ...prev,
          latitude: coordMatch[1],
          longitude: coordMatch[2]
        }));
      }
    } catch (error) {
      console.error('Failed to paste coordinates:', error);
    }
  };

  const handleLookupAddress = async () => {
    if (!formData.latitude || !formData.longitude) return;

    setLookupLoading(true);
    try {
      const result = await window.electron.reverseGeocode(
        parseFloat(formData.latitude),
        parseFloat(formData.longitude)
      );
      if (result.success && result.address) {
        setFormData(prev => ({ ...prev, address: result.address }));
      }
    } catch (error) {
      console.error('Address lookup failed:', error);
    }
    setLookupLoading(false);
  };

  const handleOpenInMaps = () => {
    if (location.latitude && location.longitude) {
      window.electron.openInMaps(location.latitude, location.longitude);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this location?')) {
      onDelete(location.id);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'restaurant': return '🍽️';
      case 'cafe': return '☕';
      case 'bar': return '🍺';
      case 'hotel': return '🏨';
      case 'attraction': return '🎭';
      case 'museum': return '🏛️';
      case 'park': return '🌳';
      case 'shop': return '🛍️';
      default: return '📍';
    }
  };

  const hasCoordinates = location.latitude && location.longitude;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="photo-detail" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="detail-header">
          <h2>
            {getCategoryIcon(location.category)} {location.name}
          </h2>
          <button className="secondary" onClick={onClose}>Close</button>
        </div>

        <div className="detail-content">
          {/* Map Preview */}
          {hasCoordinates && (
            <div style={{ height: '200px', marginBottom: '1rem', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <MapContainer
                center={[location.latitude, location.longitude]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[location.latitude, location.longitude]} />
                <MapUpdater center={[location.latitude, location.longitude]} />
              </MapContainer>
            </div>
          )}

          {/* Location Info */}
          <div className="metadata-section">
            <div className="metadata-header">
              <h3>Location Details</h3>
              <button className="small" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {isEditing ? (
              <div className="metadata-form">
                <div className="metadata-row">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="metadata-row">
                  <label>Coordinates</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      name="latitude"
                      placeholder="Latitude"
                      value={formData.latitude}
                      onChange={handleChange}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="text"
                      name="longitude"
                      placeholder="Longitude"
                      value={formData.longitude}
                      onChange={handleChange}
                      style={{ flex: 1 }}
                    />
                    <button className="small secondary" onClick={handlePasteCoordinates}>
                      Paste
                    </button>
                  </div>
                </div>

                <div className="metadata-row">
                  <label>Address</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="small secondary"
                      onClick={handleLookupAddress}
                      disabled={lookupLoading || !formData.latitude || !formData.longitude}
                    >
                      {lookupLoading ? '...' : 'Lookup'}
                    </button>
                  </div>
                </div>

                <div className="metadata-row">
                  <label>Category</label>
                  <select name="category" value={formData.category} onChange={handleChange}>
                    <option value="">Select category...</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="cafe">Cafe</option>
                    <option value="bar">Bar</option>
                    <option value="hotel">Hotel</option>
                    <option value="attraction">Attraction</option>
                    <option value="museum">Museum</option>
                    <option value="park">Park</option>
                    <option value="shop">Shop</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="metadata-row">
                  <label>Rating</label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1.5rem',
                          color: star <= formData.rating ? '#f59e0b' : '#d1d5db',
                          padding: '0'
                        }}
                      >
                        ★
                      </button>
                    ))}
                    {formData.rating > 0 && (
                      <button
                        type="button"
                        className="small secondary"
                        onClick={() => setFormData(prev => ({ ...prev, rating: 0 }))}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="metadata-row">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>

                <button onClick={handleSave} style={{ marginTop: '1rem' }}>
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="metadata-display">
                {location.category && (
                  <div className="metadata-item">
                    <span className="metadata-label">Category</span>
                    <span className="metadata-value" style={{ textTransform: 'capitalize' }}>
                      {getCategoryIcon(location.category)} {location.category}
                    </span>
                  </div>
                )}

                {location.rating > 0 && (
                  <div className="metadata-item">
                    <span className="metadata-label">Rating</span>
                    <span className="metadata-value" style={{ color: '#f59e0b' }}>
                      {'★'.repeat(location.rating)}{'☆'.repeat(5 - location.rating)}
                    </span>
                  </div>
                )}

                {hasCoordinates && (
                  <div className="metadata-item">
                    <span className="metadata-label">Coordinates</span>
                    <span className="metadata-value">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </span>
                  </div>
                )}

                {location.address && (
                  <div className="metadata-item">
                    <span className="metadata-label">Address</span>
                    <span className="metadata-value">{location.address}</span>
                  </div>
                )}

                {location.notes && (
                  <div className="metadata-item">
                    <span className="metadata-label">Notes</span>
                    <span className="metadata-value">{location.notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="metadata-section" style={{ marginTop: '1rem' }}>
            <h3>Actions</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {hasCoordinates && (
                <button className="secondary" onClick={handleOpenInMaps}>
                  Open in Maps
                </button>
              )}
              <button className="danger" onClick={handleDelete}>
                Delete Location
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LocationDetail;
