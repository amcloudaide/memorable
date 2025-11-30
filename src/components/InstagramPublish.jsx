import React, { useState, useEffect } from 'react';

function InstagramPublish({ photo, onClose, onSuccess }) {
  const [publishing, setPublishing] = useState(false);
  const [photoData, setPhotoData] = useState(null);
  const [formData, setFormData] = useState({
    caption: '',
    altText: ''
  });

  useEffect(() => {
    loadPhotoData();
    // Pre-fill caption with location name and notes if available
    let caption = '';
    if (photo.location_name) {
      caption += `📍 ${photo.location_name}\n\n`;
    }
    if (photo.notes) {
      caption += photo.notes;
    }
    setFormData(prev => ({ ...prev, caption }));
  }, [photo]);

  const loadPhotoData = async () => {
    const data = await window.electron.readPhotoFile(photo.file_path);
    setPhotoData(data);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePublish = async () => {
    if (!formData.caption.trim()) {
      alert('Please add a caption');
      return;
    }

    setPublishing(true);

    try {
      const result = await window.electron.igPublishPhoto({
        photoId: photo.id,
        filePath: photo.file_path,
        caption: formData.caption,
        altText: formData.altText || undefined
      });

      if (result.success) {
        alert('Successfully published to Instagram!');
        onSuccess && onSuccess();
        onClose();
      } else {
        alert(`Failed to publish: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="wp-publish-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wp-publish-header">
          <h3>Publish to Instagram</h3>
          <button className="secondary small" onClick={onClose}>Close</button>
        </div>

        <div className="wp-publish-content">
          {/* Photo Preview */}
          <div className="wp-publish-section">
            <label className="wp-publish-label">Photo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {photoData && (
                <img
                  src={photoData}
                  alt={photo.file_name}
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)'
                  }}
                />
              )}
              <div style={{ fontSize: '0.875rem' }}>
                <div style={{ fontWeight: '500' }}>{photo.file_name}</div>
                <div style={{ color: 'var(--text-light)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {photo.width} × {photo.height}
                </div>
              </div>
            </div>
          </div>

          {/* Caption */}
          <div className="wp-publish-section">
            <label className="wp-publish-label">Caption *</label>
            <textarea
              name="caption"
              value={formData.caption}
              onChange={handleChange}
              placeholder="Write your caption here... (max 2,200 characters)"
              rows={8}
              style={{ width: '100%', resize: 'vertical' }}
              maxLength={2200}
            />
            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.25rem', textAlign: 'right' }}>
              {formData.caption.length} / 2,200 characters
            </div>
          </div>

          {/* Alt Text */}
          <div className="wp-publish-section">
            <label className="wp-publish-label">Alt Text (Optional)</label>
            <input
              type="text"
              name="altText"
              value={formData.altText}
              onChange={handleChange}
              placeholder="Describe this photo for accessibility..."
            />
            <span className="field-hint">Helps visually impaired users understand your photo</span>
          </div>

          {/* Photo Info */}
          {(photo.location_name || photo.latitude) && (
            <div style={{ padding: '0.75rem', background: 'var(--bg-light)', borderRadius: '0.375rem', fontSize: '0.75rem' }}>
              <strong>Photo Details:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                {photo.location_name && <li>Location: {photo.location_name}</li>}
                {photo.latitude && <li>Coordinates: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}</li>}
                {photo.date_taken && <li>Date: {new Date(photo.date_taken).toLocaleDateString()}</li>}
              </ul>
            </div>
          )}

          {/* Instagram Limitations Info */}
          <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '0.375rem', fontSize: '0.75rem', marginTop: '1rem' }}>
            <strong>Note:</strong> Instagram API has a limit of 25 posts per 24 hours. Only JPEG images are supported.
          </div>
        </div>

        <div className="wp-publish-footer">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || !formData.caption.trim()}
          >
            {publishing ? 'Publishing...' : 'Publish to Instagram'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstagramPublish;
