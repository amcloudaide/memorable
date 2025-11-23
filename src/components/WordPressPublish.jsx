import React, { useState, useEffect } from 'react';

function WordPressPublish({ photos, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    selectedCategories: [],
    tagInput: '',
    selectedTags: [],
    featuredImageIndex: 0,
    status: 'draft',
    lat: '',
    lon: ''
  });

  useEffect(() => {
    loadWordPressData();
    // Pre-fill lat/lon from first photo with location
    const photoWithLocation = photos.find(p => p.latitude && p.longitude);
    if (photoWithLocation) {
      setFormData(prev => ({
        ...prev,
        lat: photoWithLocation.latitude?.toString() || '',
        lon: photoWithLocation.longitude?.toString() || ''
      }));
    }
  }, [photos]);

  const loadWordPressData = async () => {
    setLoading(true);
    try {
      const [catResult, tagResult] = await Promise.all([
        window.electron.wpGetCategories(),
        window.electron.wpGetTags()
      ]);

      if (catResult.success) {
        setCategories(catResult.categories);
      }
      if (tagResult.success) {
        setTags(tagResult.tags);
      }
    } catch (error) {
      console.error('Failed to load WordPress data:', error);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryToggle = (categoryId) => {
    setFormData(prev => {
      const selected = prev.selectedCategories.includes(categoryId)
        ? prev.selectedCategories.filter(id => id !== categoryId)
        : [...prev.selectedCategories, categoryId];
      return { ...prev, selectedCategories: selected };
    });
  };

  const handleAddTag = async () => {
    const tagName = formData.tagInput.trim();
    if (!tagName) return;

    // Check if tag already selected
    if (formData.selectedTags.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
      setFormData(prev => ({ ...prev, tagInput: '' }));
      return;
    }

    // Check if tag exists
    let existingTag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

    if (!existingTag) {
      // Create new tag
      const result = await window.electron.wpCreateTag(tagName);
      if (result.success) {
        existingTag = result.tag;
        setTags(prev => [...prev, existingTag]);
      }
    }

    if (existingTag) {
      setFormData(prev => ({
        ...prev,
        selectedTags: [...prev.selectedTags, existingTag],
        tagInput: ''
      }));
    }
  };

  const handleRemoveTag = (tagId) => {
    setFormData(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.filter(t => t.id !== tagId)
    }));
  };

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handlePublish = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    setPublishing(true);
    const mediaItems = []; // Store full media info (id + URLs)

    try {
      // Upload each photo
      setProgress({ current: 0, total: photos.length, status: 'Uploading photos...' });

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        setProgress({
          current: i + 1,
          total: photos.length,
          status: `Uploading ${photo.file_name}...`
        });

        // Build mediaInfo with date and location for WordPress media fields
        // caption = date taken, description = location info, alt_text = empty
        let description = '';
        if (photo.latitude && photo.longitude) {
          description = `${photo.latitude}, ${photo.longitude}`;
          if (photo.location_name) {
            description += ` - ${photo.location_name}`;
          }
        } else if (photo.location_name) {
          description = photo.location_name;
        }

        const mediaInfo = {
          dateTaken: photo.date_taken,
          description: description
        };

        const result = await window.electron.wpUploadMedia(photo.file_path, mediaInfo);
        if (result.success) {
          // Store full media info for Gutenberg Image blocks
          mediaItems.push({
            id: result.media.id,
            url: result.media.source_url,
            fullUrl: result.media.media_details?.sizes?.full?.source_url || result.media.source_url,
            largeUrl: result.media.media_details?.sizes?.large?.source_url || result.media.source_url
          });
        } else {
          throw new Error(`Failed to upload ${photo.file_name}: ${result.error}`);
        }
      }

      // Create the post
      setProgress({ current: photos.length, total: photos.length, status: 'Creating post...' });

      const postData = {
        title: formData.title,
        content: formData.content,
        categoryIds: formData.selectedCategories,
        tagIds: formData.selectedTags.map(t => t.id),
        mediaItems: mediaItems,
        featuredImageId: mediaItems[formData.featuredImageIndex]?.id || mediaItems[0]?.id,
        status: formData.status,
        customFields: {
          lat: formData.lat || null,
          lon: formData.lon || null
        }
      };

      const result = await window.electron.wpCreatePost(postData);

      if (result.success) {
        // Check custom fields result
        let statusMsg = 'Published successfully!';
        if (result.customFieldsResult?.attempted) {
          if (result.customFieldsResult.success) {
            statusMsg = 'Published successfully! Lat/Lon fields set.';
          } else {
            statusMsg = `Published, but Lat/Lon fields failed: ${result.customFieldsResult.error || 'Unknown error'}`;
          }
        }
        setProgress({ current: photos.length, total: photos.length, status: statusMsg });

        // Show warning if custom fields failed but post succeeded
        const delay = result.customFieldsResult?.attempted && !result.customFieldsResult?.success ? 4000 : 1500;
        setTimeout(() => {
          if (onSuccess) onSuccess(result.post);
          onClose();
        }, delay);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      alert('Publishing failed: ' + error.message);
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="wp-publish-modal" onClick={(e) => e.stopPropagation()}>
          <div className="wp-publish-loading">Loading WordPress data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="wp-publish-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wp-publish-header">
          <h3>Publish to WordPress</h3>
          <button className="secondary small" onClick={onClose} disabled={publishing}>Close</button>
        </div>

        {publishing ? (
          <div className="wp-publish-progress">
            <div className="progress-status">{progress.status}</div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className="progress-count">{progress.current} / {progress.total}</div>
          </div>
        ) : (
          <>
            <div className="wp-publish-content">
              {/* Photos Preview */}
              <div className="wp-publish-section">
                <div className="wp-publish-label">
                  {photos.length} Photo{photos.length > 1 ? 's' : ''} to Upload
                </div>
                <div className="wp-photos-preview">
                  {photos.slice(0, 6).map((photo, index) => (
                    <div
                      key={photo.id}
                      className={`wp-photo-thumb ${index === formData.featuredImageIndex ? 'featured' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, featuredImageIndex: index }))}
                      title={index === formData.featuredImageIndex ? 'Featured Image' : 'Click to set as Featured Image'}
                    >
                      <img src={photo.thumbnail || ''} alt={photo.file_name} />
                      {index === formData.featuredImageIndex && (
                        <span className="featured-badge">Featured</span>
                      )}
                    </div>
                  ))}
                  {photos.length > 6 && (
                    <div className="wp-photo-more">+{photos.length - 6} more</div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div className="wp-publish-section">
                <label className="wp-publish-label">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter post title"
                />
              </div>

              {/* Content */}
              <div className="wp-publish-section">
                <label className="wp-publish-label">Content / Description</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Enter post content (gallery will be added automatically)"
                  rows={4}
                />
              </div>

              {/* Categories */}
              <div className="wp-publish-section">
                <label className="wp-publish-label">Categories</label>
                <div className="wp-categories-list">
                  {categories.map(cat => (
                    <label key={cat.id} className="wp-category-item">
                      <input
                        type="checkbox"
                        checked={formData.selectedCategories.includes(cat.id)}
                        onChange={() => handleCategoryToggle(cat.id)}
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                  {categories.length === 0 && (
                    <span className="wp-no-items">No categories found</span>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="wp-publish-section">
                <label className="wp-publish-label">Tags</label>
                <div className="wp-tags-input">
                  <input
                    type="text"
                    value={formData.tagInput}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagInput: e.target.value }))}
                    onKeyPress={handleTagKeyPress}
                    placeholder="Type tag and press Enter"
                  />
                  <button className="small secondary" onClick={handleAddTag}>Add</button>
                </div>
                {formData.selectedTags.length > 0 && (
                  <div className="wp-selected-tags">
                    {formData.selectedTags.map(tag => (
                      <span key={tag.id} className="wp-tag">
                        {tag.name}
                        <button onClick={() => handleRemoveTag(tag.id)}>&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Fields - Lat/Lon */}
              <div className="wp-publish-section">
                <label className="wp-publish-label">Map Location (Smart Custom Fields)</label>
                <div className="wp-latlon-inputs">
                  <div className="wp-latlon-field">
                    <label>Lat</label>
                    <input
                      type="text"
                      name="lat"
                      value={formData.lat}
                      onChange={handleChange}
                      placeholder="Latitude"
                    />
                  </div>
                  <div className="wp-latlon-field">
                    <label>Lon</label>
                    <input
                      type="text"
                      name="lon"
                      value={formData.lon}
                      onChange={handleChange}
                      placeholder="Longitude"
                    />
                  </div>
                </div>
              </div>

              {/* Post Status */}
              <div className="wp-publish-section">
                <label className="wp-publish-label">Post Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="draft">Draft</option>
                  <option value="publish">Publish</option>
                  <option value="pending">Pending Review</option>
                </select>
              </div>
            </div>

            <div className="wp-publish-footer">
              <button className="secondary" onClick={onClose}>Cancel</button>
              <button onClick={handlePublish} disabled={!formData.title.trim()}>
                {formData.status === 'publish' ? 'Publish Now' : 'Save as Draft'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WordPressPublish;
