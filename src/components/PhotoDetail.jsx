import React, { useState, useEffect } from 'react';

function PhotoDetail({ photo, collections, onClose, onUpdate, onDelete, onAddToCollection, onRemoveFromCollection, onCreateLocation }) {
  const [photoData, setPhotoData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [photoCollections, setPhotoCollections] = useState([]);
  const [customMetadata, setCustomMetadata] = useState([]);
  const [newMetadataKey, setNewMetadataKey] = useState('');
  const [newMetadataValue, setNewMetadataValue] = useState('');

  // Location lookup state
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [reverseGeocodeResult, setReverseGeocodeResult] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [searchRadius, setSearchRadius] = useState(100);

  // Create location state
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [nearbyPlacesExpanded, setNearbyPlacesExpanded] = useState(false);
  const [newLocationData, setNewLocationData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    address: '',
    category: '',
    rating: 0,
    notes: ''
  });

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
      iso: photo.iso || '',
      location_name: photo.location_name || ''
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

  // Location lookup functions
  const handleLookupLocation = async () => {
    if (!photo.latitude || !photo.longitude) return;

    setShowLocationPicker(true);
    setLocationLoading(true);
    setNearbyPlaces([]);
    setReverseGeocodeResult(null);

    try {
      // Get reverse geocode result
      const geocodeResult = await window.electron.reverseGeocode(photo.latitude, photo.longitude);
      if (geocodeResult.success) {
        setReverseGeocodeResult(geocodeResult);
      }

      // Get nearby places
      const placesResult = await window.electron.searchNearbyPlaces(photo.latitude, photo.longitude, searchRadius);
      if (placesResult.success) {
        setNearbyPlaces(placesResult.places);
      }
    } catch (error) {
      console.error('Location lookup error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSearchWithRadius = async (newRadius) => {
    setSearchRadius(newRadius);
    setLocationLoading(true);

    try {
      const placesResult = await window.electron.searchNearbyPlaces(photo.latitude, photo.longitude, newRadius);
      if (placesResult.success) {
        setNearbyPlaces(placesResult.places);
      }
    } catch (error) {
      console.error('Location search error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSelectPlace = async (placeName) => {
    await onUpdate(photo.id, { location_name: placeName });
    setFormData(prev => ({ ...prev, location_name: placeName }));
    setShowLocationPicker(false);
  };

  const handleOpenInMaps = async () => {
    if (photo.latitude && photo.longitude) {
      await window.electron.openInMaps(photo.latitude, photo.longitude);
    }
  };

  // Create location functions
  const handleOpenCreateLocation = async () => {
    if (!photo.latitude || !photo.longitude) return;

    // Pre-fill with photo data
    setNewLocationData({
      name: photo.location_name || '',
      latitude: photo.latitude.toString(),
      longitude: photo.longitude.toString(),
      address: '',
      category: '',
      rating: 0,
      notes: ''
    });
    setShowCreateLocation(true);
    setNearbyPlaces([]);
    setReverseGeocodeResult(null);
    setLocationLoading(true);

    try {
      // Get reverse geocode result
      const geocodeResult = await window.electron.reverseGeocode(photo.latitude, photo.longitude);
      if (geocodeResult.success) {
        setReverseGeocodeResult(geocodeResult);
        setNewLocationData(prev => ({ ...prev, address: geocodeResult.address }));
      }

      // Get nearby places
      const placesResult = await window.electron.searchNearbyPlaces(photo.latitude, photo.longitude, searchRadius);
      if (placesResult.success) {
        setNearbyPlaces(placesResult.places);
      }
    } catch (error) {
      console.error('Location lookup error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSearchNearbyForCreate = async (newRadius) => {
    setSearchRadius(newRadius);
    setLocationLoading(true);

    try {
      const placesResult = await window.electron.searchNearbyPlaces(photo.latitude, photo.longitude, newRadius);
      if (placesResult.success) {
        setNearbyPlaces(placesResult.places);
      }
    } catch (error) {
      console.error('Location search error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSelectPlaceForCreate = (place) => {
    setNewLocationData(prev => ({
      ...prev,
      name: place.name || place,
      category: typeof place === 'object' ? mapPlaceCategory(place.category) : prev.category
    }));
  };

  const mapPlaceCategory = (category) => {
    const mapping = {
      'Food & Drink': 'restaurant',
      'Tourism': 'attraction',
      'Historic': 'museum',
      'Leisure': 'park',
      'Shop': 'shop',
      'Amenity': 'other'
    };
    return mapping[category] || 'other';
  };

  const handleCreateLocationSubmit = async () => {
    if (!newLocationData.name.trim()) {
      alert('Please enter a location name');
      return;
    }

    await onCreateLocation({
      ...newLocationData,
      latitude: parseFloat(newLocationData.latitude),
      longitude: parseFloat(newLocationData.longitude),
      rating: parseInt(newLocationData.rating) || 0
    });

    setShowCreateLocation(false);
    alert('Location created successfully!');
  };

  const handleGoogleSearch = () => {
    if (photo.latitude && photo.longitude) {
      // Open Google search for the coordinates - will help find the place name
      const query = encodeURIComponent(`${photo.latitude}, ${photo.longitude}`);
      window.open(`https://www.google.com/search?q=${query}`, '_blank');
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

  const formatDistance = (meters) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Food & Drink': '🍽️',
      'Tourism': '🏛️',
      'Historic': '🏰',
      'Leisure': '🌳',
      'Shop': '🛒',
      'Amenity': '📍',
      'Place': '📌'
    };
    return icons[category] || '📍';
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

        <div className="photo-detail-sidebar" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Fixed Header */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div className="flex justify-between items-center mb-2">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{photo.file_name}</h2>
              <button className="secondary small" onClick={onClose}>Close</button>
            </div>
            <div className="flex justify-between items-center">
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-light)', margin: 0 }}>Metadata</h3>
              {!editing ? (
                <button className="small" onClick={() => setEditing(true)}>Edit</button>
              ) : (
                <div className="flex gap-2">
                  <button className="small" onClick={handleSave}>Save</button>
                  <button className="small secondary" onClick={handleCancel}>Cancel</button>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <div className="detail-section" style={{ marginTop: 0 }}>

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
                    {photo.latitude && photo.longitude ? (
                      <div className="location-info">
                        <span>{photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}</span>
                        <div className="location-actions">
                          <button className="small secondary" onClick={handleLookupLocation}>
                            Lookup Places
                          </button>
                          <button className="small secondary" onClick={handleOpenInMaps}>
                            Open Maps
                          </button>
                        </div>
                      </div>
                    ) : (
                      'No location data'
                    )}
                  </div>
                )}
              </div>

              {/* Location Name Field */}
              <div className="metadata-item">
                <label className="metadata-label">Location Name</label>
                {editing ? (
                  <input
                    type="text"
                    name="location_name"
                    value={formData.location_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Central Park, NYC"
                  />
                ) : (
                  <div className="metadata-value">
                    {photo.location_name || formData.location_name || 'Not set'}
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

          </div>

          {/* Fixed Footer - Actions */}
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-light)', flexShrink: 0 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {photo.latitude && photo.longitude && onCreateLocation && (
                <button onClick={handleOpenCreateLocation} style={{ width: '100%' }}>
                  Create Location from Photo
                </button>
              )}
              <button onClick={handleWriteToExif} style={{ width: '100%' }}>
                Write Metadata to EXIF
              </button>
              <button className="danger" onClick={() => onDelete(photo.id)} style={{ width: '100%' }}>
                Delete from Database
              </button>
            </div>
          </div>
        </div>

        {/* Location Picker Modal */}
        {showLocationPicker && (
          <div className="location-picker-overlay" onClick={() => setShowLocationPicker(false)}>
            <div className="location-picker" onClick={(e) => e.stopPropagation()}>
              <div className="location-picker-header">
                <h3>Select Location</h3>
                <button className="secondary small" onClick={() => setShowLocationPicker(false)}>Close</button>
              </div>

              {/* Reverse Geocode Result */}
              {reverseGeocodeResult && (
                <div className="location-section">
                  <div className="location-section-title">Address</div>
                  <div
                    className="location-result-item clickable"
                    onClick={() => handleSelectPlace(reverseGeocodeResult.address)}
                  >
                    <span className="location-icon">📍</span>
                    <div className="location-result-info">
                      <div className="location-result-name">{reverseGeocodeResult.address}</div>
                      <div className="location-result-type">Click to use this address</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Radius Control */}
              <div className="location-section">
                <div className="location-section-title">
                  Search Radius: {searchRadius}m
                </div>
                <div className="radius-buttons">
                  {[50, 100, 200, 500, 1000].map(radius => (
                    <button
                      key={radius}
                      className={`small ${searchRadius === radius ? '' : 'secondary'}`}
                      onClick={() => handleSearchWithRadius(radius)}
                    >
                      {radius}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Nearby Places */}
              <div className="location-section">
                <div className="location-section-title">
                  Nearby Places {nearbyPlaces.length > 0 && `(${nearbyPlaces.length})`}
                </div>

                {locationLoading ? (
                  <div className="location-loading">Searching...</div>
                ) : nearbyPlaces.length === 0 ? (
                  <div className="location-empty">No places found nearby. Try increasing the search radius.</div>
                ) : (
                  <div className="location-results">
                    {nearbyPlaces.map((place) => (
                      <div
                        key={place.id}
                        className="location-result-item clickable"
                        onClick={() => handleSelectPlace(place.name)}
                      >
                        <span className="location-icon">{getCategoryIcon(place.category)}</span>
                        <div className="location-result-info">
                          <div className="location-result-name">{place.name}</div>
                          <div className="location-result-type">
                            {place.category} • {formatDistance(place.distance)}
                            {place.address && ` • ${place.address}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Input */}
              <div className="location-section">
                <div className="location-section-title">Custom Location Name</div>
                <div className="custom-location-input">
                  <input
                    type="text"
                    placeholder="Enter custom location name..."
                    id="custom-location"
                  />
                  <button
                    className="small"
                    onClick={() => {
                      const input = document.getElementById('custom-location');
                      if (input.value.trim()) {
                        handleSelectPlace(input.value.trim());
                      }
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Location Modal */}
        {showCreateLocation && (
          <div className="location-picker-overlay" onClick={() => setShowCreateLocation(false)}>
            <div className="location-picker" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="location-picker-header">
                <h3>Create Location from Photo</h3>
                <button className="secondary small" onClick={() => setShowCreateLocation(false)}>Close</button>
              </div>

              {/* Scrollable Content */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Location Name Input */}
                <div className="location-section">
                  <div className="location-section-title">Location Name *</div>
                  <input
                    type="text"
                    value={newLocationData.name}
                    onChange={(e) => setNewLocationData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter location name..."
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Coordinates (pre-filled, readonly display) */}
                <div className="location-section">
                  <div className="location-section-title">Coordinates (from photo)</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {newLocationData.latitude}, {newLocationData.longitude}
                    </span>
                    <button className="small secondary" onClick={handleGoogleSearch}>
                      Search Google
                    </button>
                    <button className="small secondary" onClick={handleOpenInMaps}>
                      Open Maps
                    </button>
                  </div>
                </div>

                {/* Category */}
                <div className="location-section">
                  <div className="location-section-title">Category</div>
                  <select
                    value={newLocationData.category}
                    onChange={(e) => setNewLocationData(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select category...</option>
                    <option value="restaurant">🍽️ Restaurant</option>
                    <option value="cafe">☕ Cafe</option>
                    <option value="bar">🍺 Bar</option>
                    <option value="hotel">🏨 Hotel</option>
                    <option value="attraction">🎭 Attraction</option>
                    <option value="museum">🏛️ Museum</option>
                    <option value="park">🌳 Park</option>
                    <option value="shop">🛍️ Shop</option>
                    <option value="other">📍 Other</option>
                  </select>
                </div>

                {/* Rating */}
                <div className="location-section">
                  <div className="location-section-title">Rating</div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewLocationData(prev => ({ ...prev, rating: star }))}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1.5rem',
                          color: star <= newLocationData.rating ? '#f59e0b' : '#d1d5db',
                          padding: '0'
                        }}
                      >
                        ★
                      </button>
                    ))}
                    {newLocationData.rating > 0 && (
                      <button
                        className="small secondary"
                        onClick={() => setNewLocationData(prev => ({ ...prev, rating: 0 }))}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="location-section">
                  <div className="location-section-title">Address</div>
                  <input
                    type="text"
                    value={newLocationData.address}
                    onChange={(e) => setNewLocationData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Address (auto-filled from lookup)"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Notes */}
                <div className="location-section">
                  <div className="location-section-title">Notes</div>
                  <textarea
                    value={newLocationData.notes}
                    onChange={(e) => setNewLocationData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add notes..."
                    rows={2}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Collapsible Find Nearby Places Section */}
                <div className="location-section" style={{ borderBottom: 'none' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onClick={() => setNearbyPlacesExpanded(!nearbyPlacesExpanded)}
                  >
                    <div className="location-section-title" style={{ marginBottom: 0 }}>
                      Find Nearby Places
                    </div>
                    <span style={{ fontSize: '1.25rem', color: '#6b7280' }}>
                      {nearbyPlacesExpanded ? '▼' : '▶'}
                    </span>
                  </div>

                  {nearbyPlacesExpanded && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {/* Search Radius Control */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                          Search Radius: {searchRadius}m
                        </div>
                        <div className="radius-buttons">
                          {[50, 100, 200, 500, 1000].map(radius => (
                            <button
                              key={radius}
                              className={`small ${searchRadius === radius ? '' : 'secondary'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSearchNearbyForCreate(radius);
                              }}
                            >
                              {radius}m
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Nearby Places */}
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                          Click to use name {nearbyPlaces.length > 0 && `(${nearbyPlaces.length} found)`}
                        </div>

                        {locationLoading ? (
                          <div className="location-loading">Searching...</div>
                        ) : nearbyPlaces.length === 0 ? (
                          <div className="location-empty">No places found. Try increasing search radius or use Google Search.</div>
                        ) : (
                          <div className="location-results" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                            {nearbyPlaces.map((place) => (
                              <div
                                key={place.id}
                                className="location-result-item clickable"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectPlaceForCreate(place);
                                }}
                              >
                                <span className="location-icon">{getCategoryIcon(place.category)}</span>
                                <div className="location-result-info">
                                  <div className="location-result-name">{place.name}</div>
                                  <div className="location-result-type">
                                    {place.category} • {formatDistance(place.distance)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Footer with Create Button */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: '#f3f4f6', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleCreateLocationSubmit}
                  disabled={!newLocationData.name.trim()}
                  style={{ flex: 1 }}
                >
                  Create Location
                </button>
                <button className="secondary" onClick={() => setShowCreateLocation(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PhotoDetail;
