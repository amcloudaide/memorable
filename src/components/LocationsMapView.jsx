import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Custom marker icons based on category
const createCategoryIcon = (category) => {
  const getEmoji = () => {
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

  return L.divIcon({
    html: `<div style="font-size: 24px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${getEmoji()}</div>`,
    className: 'location-marker-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

function LocationsMapView({ locations, onLocationClick }) {
  // Filter locations with coordinates
  const locationsWithCoords = useMemo(() =>
    locations.filter(loc => loc.latitude && loc.longitude),
    [locations]
  );

  // Calculate center and bounds
  const mapConfig = useMemo(() => {
    if (locationsWithCoords.length === 0) {
      return { center: [0, 0], zoom: 2 };
    }

    if (locationsWithCoords.length === 1) {
      return {
        center: [locationsWithCoords[0].latitude, locationsWithCoords[0].longitude],
        zoom: 13
      };
    }

    const lats = locationsWithCoords.map(l => l.latitude);
    const lngs = locationsWithCoords.map(l => l.longitude);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    return { center: [centerLat, centerLng], zoom: 4 };
  }, [locationsWithCoords]);

  const renderStars = (rating) => {
    if (!rating) return null;
    return (
      <span style={{ color: '#f59e0b' }}>
        {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
      </span>
    );
  };

  if (locationsWithCoords.length === 0) {
    return (
      <div className="map-empty">
        <p>No locations with coordinates to display.</p>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Add locations with latitude and longitude to see them on the map.
        </p>
      </div>
    );
  }

  return (
    <div className="map-container">
      <MapContainer
        center={mapConfig.center}
        zoom={mapConfig.zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locationsWithCoords.map(location => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={createCategoryIcon(location.category)}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
                  {location.name}
                </h4>

                {location.category && (
                  <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                    {location.category}
                  </p>
                )}

                {location.rating > 0 && (
                  <p style={{ margin: '0.25rem 0' }}>
                    {renderStars(location.rating)}
                  </p>
                )}

                {location.address && (
                  <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.75rem' }}>
                    {location.address}
                  </p>
                )}

                <button
                  onClick={() => onLocationClick(location)}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
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

export default LocationsMapView;
