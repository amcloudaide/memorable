import React, { useState, useEffect, useRef, useMemo } from 'react';

function PhotoGrid({ photos, onPhotoClick, selectedCollection, collections, onRefresh }) {
  const [photoThumbnails, setPhotoThumbnails] = useState({});
  const [displayPhotos, setDisplayPhotos] = useState([]);
  const [thumbnailSize, setThumbnailSize] = useState(200);
  const [activeDate, setActiveDate] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationInput, setLocationInput] = useState({ latitude: '', longitude: '', location_name: '' });
  const [locationLoading, setLocationLoading] = useState(false);
  const scrollContainerRef = useRef(null);
  const dateRefs = useRef({});

  useEffect(() => {
    if (selectedCollection) {
      loadCollectionPhotos();
    } else {
      setDisplayPhotos(photos);
    }
  }, [photos, selectedCollection]);

  // Clear selection when exiting selection mode
  useEffect(() => {
    if (!selectionMode) {
      setSelectedIds(new Set());
    }
  }, [selectionMode]);

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

  // Group photos by date
  const groupedPhotos = useMemo(() => {
    const groups = {};
    displayPhotos.forEach(photo => {
      const dateKey = getDateKey(photo.date_taken);
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: photo.date_taken,
          label: formatDateHeader(photo.date_taken),
          photos: []
        };
      }
      groups[dateKey].photos.push(photo);
    });

    // Sort by date descending
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, value]) => ({ key, ...value }));
  }, [displayPhotos]);

  // Get unique dates for timeline
  const timelineDates = useMemo(() => {
    const dates = [];
    let currentYear = null;

    groupedPhotos.forEach(group => {
      const year = getYear(group.date);
      const month = getMonthShort(group.date);

      if (year !== currentYear) {
        dates.push({ type: 'year', label: year, key: `year-${year}` });
        currentYear = year;
      }
      dates.push({
        type: 'month',
        label: month,
        key: group.key,
        fullLabel: group.label
      });
    });

    return dates;
  }, [groupedPhotos]);

  function getDateKey(dateString) {
    if (!dateString) return 'unknown';
    try {
      const date = new Date(dateString);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } catch {
      return 'unknown';
    }
  }

  function formatDateHeader(dateString) {
    if (!dateString) return 'Unknown Date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long'
      });
    } catch {
      return 'Unknown Date';
    }
  }

  function getYear(dateString) {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).getFullYear().toString();
    } catch {
      return 'Unknown';
    }
  }

  function getMonthShort(dateString) {
    if (!dateString) return '?';
    try {
      return new Date(dateString).toLocaleDateString(undefined, { month: 'short' });
    } catch {
      return '?';
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  const scrollToDate = (key) => {
    const element = dateRefs.current[key];
    if (element && scrollContainerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveDate(key);
    }
  };

  // Track scroll position to update active date
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;

    // Find which date group is currently in view
    for (const group of groupedPhotos) {
      const element = dateRefs.current[group.key];
      if (element) {
        const rect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (rect.top <= containerRect.top + 100 && rect.bottom > containerRect.top) {
          setActiveDate(group.key);
          break;
        }
      }
    }
  };

  // Selection handlers
  const toggleSelection = (photoId, event) => {
    event.stopPropagation();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const handlePhotoClick = (photo, event) => {
    if (selectionMode) {
      toggleSelection(photo.id, event);
    } else {
      onPhotoClick(photo);
    }
  };

  const selectAll = () => {
    setSelectedIds(new Set(displayPhotos.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (confirm(`Are you sure you want to remove ${count} photo${count > 1 ? 's' : ''} from the database?`)) {
      try {
        await window.electron.deletePhotos(Array.from(selectedIds));
        setSelectedIds(new Set());
        setSelectionMode(false);
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error deleting photos:', error);
      }
    }
  };

  const handleAddToCollection = async (collectionId) => {
    if (selectedIds.size === 0) return;

    try {
      await window.electron.addPhotosToCollection(Array.from(selectedIds), collectionId);
      setShowCollectionPicker(false);
      setSelectedIds(new Set());
      setSelectionMode(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error adding photos to collection:', error);
    }
  };

  const handleRemoveFromCollection = async () => {
    if (selectedIds.size === 0 || !selectedCollection) return;

    const count = selectedIds.size;
    if (confirm(`Remove ${count} photo${count > 1 ? 's' : ''} from this collection?`)) {
      try {
        await window.electron.removePhotosFromCollection(Array.from(selectedIds), selectedCollection);
        setSelectedIds(new Set());
        setSelectionMode(false);
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error removing photos from collection:', error);
      }
    }
  };

  // Location modal handlers
  const openLocationModal = () => {
    setLocationInput({ latitude: '', longitude: '', location_name: '' });
    setShowLocationModal(true);
  };

  const handleOpenGoogleMaps = () => {
    // Open Google Maps in browser for searching
    window.open('https://www.google.com/maps', '_blank');
  };

  const handlePasteCoordinates = async () => {
    try {
      // Use Electron's clipboard API (more reliable in Electron apps)
      let text;
      if (window.electron && window.electron.readClipboard) {
        text = window.electron.readClipboard();
      } else {
        text = await navigator.clipboard.readText();
      }
      const trimmedText = text.trim();

      console.log('Clipboard content:', trimmedText); // Debug log

      let lat, lng;

      // Try Google Maps URL format: @48.8584,2.2945
      const urlMatch = trimmedText.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (urlMatch) {
        lat = urlMatch[1];
        lng = urlMatch[2];
      }

      // Try simple comma-separated format: "48.8584, 2.2945" or "48.8584,2.2945"
      // This is what Google Maps copies when you click on coordinates
      if (!lat || !lng) {
        const simpleMatch = trimmedText.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
        if (simpleMatch) {
          lat = simpleMatch[1];
          lng = simpleMatch[2];
        }
      }

      // Try format with any separating characters (more lenient)
      if (!lat || !lng) {
        const lenientMatch = trimmedText.match(/(-?\d+\.\d+)[^\d-]+(-?\d+\.\d+)/);
        if (lenientMatch) {
          lat = lenientMatch[1];
          lng = lenientMatch[2];
        }
      }

      // Try to extract just two decimal numbers from the text
      if (!lat || !lng) {
        const numbers = trimmedText.match(/-?\d+\.\d+/g);
        if (numbers && numbers.length >= 2) {
          lat = numbers[0];
          lng = numbers[1];
        }
      }

      if (lat && lng) {
        // Validate the coordinates are in reasonable ranges
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        if (latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
          setLocationInput(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }));
        } else {
          alert(`Coordinates out of range. Latitude: ${lat}, Longitude: ${lng}`);
        }
      } else {
        alert(`Could not parse coordinates from: "${trimmedText}"\n\nPlease enter them manually or try copying the coordinates again from Google Maps.`);
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      alert('Could not access clipboard. Please paste coordinates manually using Ctrl+V in the input fields.');
    }
  };

  const handleLookupLocationName = async () => {
    if (!locationInput.latitude || !locationInput.longitude) {
      alert('Please enter coordinates first');
      return;
    }

    setLocationLoading(true);
    try {
      const result = await window.electron.reverseGeocode(
        parseFloat(locationInput.latitude),
        parseFloat(locationInput.longitude)
      );
      if (result.success) {
        setLocationInput(prev => ({
          ...prev,
          location_name: result.address
        }));
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleApplyLocation = async () => {
    if (selectedIds.size === 0) return;

    const lat = locationInput.latitude ? parseFloat(locationInput.latitude) : null;
    const lng = locationInput.longitude ? parseFloat(locationInput.longitude) : null;

    if (!lat || !lng) {
      alert('Please enter valid latitude and longitude');
      return;
    }

    try {
      await window.electron.updatePhotosLocation(Array.from(selectedIds), {
        latitude: lat,
        longitude: lng,
        location_name: locationInput.location_name || null
      });

      setShowLocationModal(false);
      setSelectedIds(new Set());
      setSelectionMode(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Failed to update location');
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
    <div className="photo-grid-container">
      <div className="photo-grid-main">
        {/* Selection Toolbar */}
        {selectionMode && (
          <div className="selection-toolbar">
            <div className="selection-info">
              <span>{selectedIds.size} selected</span>
              <button className="secondary small" onClick={selectAll}>Select All</button>
              <button className="secondary small" onClick={deselectAll}>Deselect All</button>
            </div>
            <div className="selection-actions">
              <button
                className="secondary"
                onClick={openLocationModal}
                disabled={selectedIds.size === 0}
              >
                Set Location
              </button>
              <div className="collection-picker-wrapper">
                <button
                  className="secondary"
                  onClick={() => setShowCollectionPicker(!showCollectionPicker)}
                  disabled={selectedIds.size === 0}
                >
                  Add to Collection
                </button>
                {showCollectionPicker && collections && collections.length > 0 && (
                  <div className="collection-picker-dropdown">
                    {collections.map(collection => (
                      <div
                        key={collection.id}
                        className="collection-picker-item"
                        onClick={() => handleAddToCollection(collection.id)}
                      >
                        {collection.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedCollection && (
                <button
                  className="secondary"
                  onClick={handleRemoveFromCollection}
                  disabled={selectedIds.size === 0}
                >
                  Remove from Collection
                </button>
              )}
              <button
                className="danger"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
              >
                Delete
              </button>
              <button className="secondary" onClick={() => setSelectionMode(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Regular Toolbar */}
        <div className="photo-grid-toolbar">
          <div className="toolbar-info">
            {displayPhotos.length} photos
            {!selectionMode && (
              <button className="secondary small" onClick={() => setSelectionMode(true)}>
                Select
              </button>
            )}
          </div>
          <div className="size-slider-container">
            <label>Size:</label>
            <input
              type="range"
              className="size-slider"
              min="100"
              max="400"
              step="25"
              value={thumbnailSize}
              onChange={(e) => setThumbnailSize(Number(e.target.value))}
            />
          </div>
        </div>

        <div
          className="photo-grid-scroll"
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{ '--thumbnail-size': `${thumbnailSize}px` }}
        >
          {groupedPhotos.map((group) => (
            <div
              key={group.key}
              className="date-group"
              ref={el => dateRefs.current[group.key] = el}
            >
              <div className="date-group-header">
                {group.label}
              </div>
              <div className="date-group-photos">
                {group.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`photo-card ${selectedIds.has(photo.id) ? 'selected' : ''}`}
                    onClick={(e) => handlePhotoClick(photo, e)}
                  >
                    {selectionMode && (
                      <div
                        className={`photo-checkbox ${selectedIds.has(photo.id) ? 'checked' : ''}`}
                        onClick={(e) => toggleSelection(photo.id, e)}
                      >
                        {selectedIds.has(photo.id) && '✓'}
                      </div>
                    )}
                    {photoThumbnails[photo.id] ? (
                      <img src={photoThumbnails[photo.id]} alt={photo.file_name} />
                    ) : (
                      <div className="photo-placeholder">
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
            </div>
          ))}
        </div>
      </div>

      {/* Date Timeline Sidebar */}
      <div className="date-timeline">
        {timelineDates.map((item) => (
          item.type === 'year' ? (
            <div key={item.key} className="date-timeline-year">
              {item.label}
            </div>
          ) : (
            <div
              key={item.key}
              className={`date-timeline-item ${activeDate === item.key ? 'active' : ''}`}
              onClick={() => scrollToDate(item.key)}
              title={item.fullLabel}
            >
              {item.label}
            </div>
          )
        ))}
      </div>

      {/* Set Location Modal */}
      {showLocationModal && (
        <div className="location-modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="location-modal" onClick={(e) => e.stopPropagation()}>
            <div className="location-modal-header">
              <h3>Set Location for {selectedIds.size} Photo{selectedIds.size > 1 ? 's' : ''}</h3>
              <button className="secondary small" onClick={() => setShowLocationModal(false)}>Close</button>
            </div>

            <div className="location-modal-content">
              {/* Instructions */}
              <div className="location-modal-section">
                <div className="location-modal-instructions">
                  <p><strong>How to get coordinates from Google Maps:</strong></p>
                  <ol>
                    <li>Click "Open Google Maps" below</li>
                    <li>Search for your location</li>
                    <li>Right-click on the exact spot and click the coordinates to copy them</li>
                    <li>Come back here and click "Paste Coordinates"</li>
                  </ol>
                </div>
                <button className="secondary" onClick={handleOpenGoogleMaps}>
                  Open Google Maps
                </button>
              </div>

              {/* Coordinates Input */}
              <div className="location-modal-section">
                <div className="location-modal-label">Coordinates</div>

                {/* Quick paste field */}
                <div className="coordinate-paste-field">
                  <input
                    type="text"
                    placeholder="Paste coordinates here (e.g., 13.744923, 100.556086)"
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData('text').trim();
                      console.log('Pasted text:', text);

                      // Try to parse coordinates
                      const numbers = text.match(/-?\d+\.\d+/g);
                      if (numbers && numbers.length >= 2) {
                        const lat = parseFloat(numbers[0]);
                        const lng = parseFloat(numbers[1]);
                        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                          setLocationInput(prev => ({
                            ...prev,
                            latitude: numbers[0],
                            longitude: numbers[1]
                          }));
                        } else {
                          alert('Coordinates out of valid range');
                        }
                      } else {
                        alert('Could not parse coordinates. Please enter them manually below.');
                      }
                    }}
                    onChange={() => {}} // Controlled but we handle via onPaste
                    value={locationInput.latitude && locationInput.longitude ? `${locationInput.latitude}, ${locationInput.longitude}` : ''}
                  />
                  <span className="paste-hint">Press Ctrl+V to paste</span>
                </div>

                <div className="coordinates-separator">or enter manually:</div>

                <div className="coordinates-input-row">
                  <div className="coordinate-input">
                    <label>Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g., 13.744923"
                      value={locationInput.latitude}
                      onChange={(e) => setLocationInput(prev => ({ ...prev, latitude: e.target.value }))}
                    />
                  </div>
                  <div className="coordinate-input">
                    <label>Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g., 100.556086"
                      value={locationInput.longitude}
                      onChange={(e) => setLocationInput(prev => ({ ...prev, longitude: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="coordinates-actions">
                  <button className="secondary small" onClick={handlePasteCoordinates}>
                    Paste from Clipboard
                  </button>
                  <button
                    className="secondary small"
                    onClick={handleLookupLocationName}
                    disabled={!locationInput.latitude || !locationInput.longitude || locationLoading}
                  >
                    {locationLoading ? 'Looking up...' : 'Lookup Address'}
                  </button>
                </div>
              </div>

              {/* Location Name Input */}
              <div className="location-modal-section">
                <div className="location-modal-label">Location Name (optional)</div>
                <input
                  type="text"
                  placeholder="e.g., Eiffel Tower, Paris"
                  value={locationInput.location_name}
                  onChange={(e) => setLocationInput(prev => ({ ...prev, location_name: e.target.value }))}
                />
                <div className="location-hint">
                  This will be saved as the location name for all selected photos.
                </div>
              </div>
            </div>

            <div className="location-modal-footer">
              <button className="secondary" onClick={() => setShowLocationModal(false)}>
                Cancel
              </button>
              <button
                onClick={handleApplyLocation}
                disabled={!locationInput.latitude || !locationInput.longitude}
              >
                Apply to {selectedIds.size} Photo{selectedIds.size > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotoGrid;
