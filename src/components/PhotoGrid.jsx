import React, { useState, useEffect, useRef, useMemo } from 'react';

function PhotoGrid({ photos, onPhotoClick, selectedCollection }) {
  const [photoThumbnails, setPhotoThumbnails] = useState({});
  const [displayPhotos, setDisplayPhotos] = useState([]);
  const [thumbnailSize, setThumbnailSize] = useState(200);
  const [activeDate, setActiveDate] = useState(null);
  const scrollContainerRef = useRef(null);
  const dateRefs = useRef({});

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
    const scrollTop = container.scrollTop;

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
        <div className="photo-grid-toolbar">
          <div className="toolbar-info">
            {displayPhotos.length} photos
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
                    className="photo-card"
                    onClick={() => onPhotoClick(photo)}
                  >
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
    </div>
  );
}

export default PhotoGrid;
