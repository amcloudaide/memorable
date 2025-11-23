import React from 'react';

function Locations({ locations, selectedLocation, onSelectLocation, onDeleteLocation }) {
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
    if (!rating) return null;
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Locations</h2>
      </div>

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
                  {location.address.length > 40 ? location.address.substring(0, 40) + '...' : location.address}
                </div>
              )}
            </div>
            {selectedLocation?.id === location.id && (
              <button
                className="danger small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this location?')) {
                    onDeleteLocation(location.id);
                  }
                }}
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>

      {locations.length === 0 && (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
          <p>No locations yet.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
            Open a photo with GPS data and click "Create Location from Photo" to add one.
          </p>
        </div>
      )}
    </div>
  );
}

export default Locations;
