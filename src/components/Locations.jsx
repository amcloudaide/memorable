import React, { useState } from 'react';

function Locations({ locations, selectedLocation, onSelectLocation, onCreateLocation, onDeleteLocation }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    address: '',
    category: '',
    rating: 0,
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = () => {
    if (formData.name.trim()) {
      onCreateLocation({
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        rating: parseInt(formData.rating) || 0
      });
      setFormData({
        name: '',
        latitude: '',
        longitude: '',
        address: '',
        category: '',
        rating: 0,
        notes: ''
      });
      setShowCreateForm(false);
    }
  };

  const handlePasteCoordinates = async () => {
    try {
      const text = await window.electron.readClipboard();
      // Try to parse coordinates from various formats
      // Format: "lat, lon" or Google Maps URL
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

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Locations</h2>
        <button className="small" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'New'}
        </button>
      </div>

      {showCreateForm && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.375rem' }}>
          <input
            type="text"
            name="name"
            placeholder="Location name *"
            value={formData.name}
            onChange={handleChange}
            style={{ marginBottom: '0.5rem' }}
          />

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
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
            <button
              type="button"
              className="small secondary"
              onClick={handlePasteCoordinates}
              title="Paste coordinates from clipboard"
            >
              Paste
            </button>
          </div>

          <input
            type="text"
            name="address"
            placeholder="Address (optional)"
            value={formData.address}
            onChange={handleChange}
            style={{ marginBottom: '0.5rem' }}
          />

          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            style={{ marginBottom: '0.5rem', width: '100%' }}
          >
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

          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>Rating</label>
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
                    fontSize: '1.25rem',
                    color: star <= formData.rating ? '#f59e0b' : '#d1d5db',
                    padding: '0'
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <textarea
            name="notes"
            placeholder="Notes (optional)"
            value={formData.notes}
            onChange={handleChange}
            style={{ marginBottom: '0.5rem', minHeight: '60px' }}
          />

          <button onClick={handleCreate} style={{ width: '100%' }} disabled={!formData.name.trim()}>
            Create Location
          </button>
        </div>
      )}

      <ul className="collection-list">
        {locations.map((location) => (
          <li
            key={location.id}
            className={`collection-item ${selectedLocation?.id === location.id ? 'active' : ''}`}
          >
            <div onClick={() => onSelectLocation(location)}>
              <div className="collection-name">
                {getCategoryIcon(location.category)} {location.name}
              </div>
              {location.rating > 0 && (
                <div style={{ color: '#f59e0b', fontSize: '0.75rem' }}>
                  {renderStars(location.rating)}
                </div>
              )}
              {location.address && (
                <div className="collection-count" style={{ fontSize: '0.75rem' }}>
                  {location.address}
                </div>
              )}
            </div>
            {selectedLocation?.id === location.id && (
              <button
                className="danger small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteLocation(location.id);
                }}
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                Delete Location
              </button>
            )}
          </li>
        ))}
      </ul>

      {locations.length === 0 && !showCreateForm && (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
          No locations yet. Click "New" to add one.
        </div>
      )}
    </div>
  );
}

export default Locations;
