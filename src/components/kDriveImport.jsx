import React, { useState, useEffect } from 'react';

function kDriveImport({ onClose, onImportComplete }) {
  const [currentPath, setCurrentPath] = useState('/');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [pathHistory, setPathHistory] = useState(['/']);

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);

  const loadDirectory = async (path) => {
    setLoading(true);
    try {
      const result = await window.electron.kDriveListDirectory(path);
      if (result.success) {
        setItems(result.items);
      } else {
        alert('Failed to load directory: ' + result.error);
      }
    } catch (error) {
      alert('Error loading directory: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (item) => {
    if (item.type === 'directory') {
      const newPath = currentPath === '/' ? `/${item.basename}` : `${currentPath}/${item.basename}`;
      setCurrentPath(newPath);
      setPathHistory(prev => [...prev, newPath]);
    }
  };

  const handleBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      const previousPath = newHistory[newHistory.length - 1];
      setPathHistory(newHistory);
      setCurrentPath(previousPath);
    }
  };

  const handleSelectFile = (item) => {
    if (item.type === 'file' && isImageFile(item.basename)) {
      setSelectedFiles(prev => {
        const isSelected = prev.some(f => f.filename === item.filename);
        if (isSelected) {
          return prev.filter(f => f.filename !== item.filename);
        } else {
          return [...prev, item];
        }
      });
    }
  };

  const handleSelectAll = () => {
    const imageFiles = items.filter(item => item.type === 'file' && isImageFile(item.basename));
    if (selectedFiles.length === imageFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(imageFiles);
    }
  };

  const isImageFile = (filename) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one photo to import');
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: selectedFiles.length });

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setImportProgress({ current: i + 1, total: selectedFiles.length });

        const result = await window.electron.kDriveImportPhoto(file.filename);
        if (!result.success) {
          console.error('Failed to import:', file.basename, result.error);
        }
      }

      alert(`Successfully imported ${selectedFiles.length} photo(s)!`);
      onImportComplete && onImportComplete();
      onClose();
    } catch (error) {
      alert('Import error: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const getFileIcon = (item) => {
    if (item.type === 'directory') return '📁';
    if (isImageFile(item.basename)) return '🖼️';
    return '📄';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="wp-publish-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="wp-publish-header">
          <h3>Import from kDrive</h3>
          <button className="secondary small" onClick={onClose}>Close</button>
        </div>

        {importing ? (
          <div className="wp-publish-progress">
            <div className="progress-status">
              Importing photos from kDrive...
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              />
            </div>
            <div className="progress-count">
              {importProgress.current} of {importProgress.total} photos
            </div>
          </div>
        ) : (
          <>
            <div className="wp-publish-content">
              {/* Navigation Bar */}
              <div style={{
                padding: '0.75rem',
                background: 'var(--bg-light)',
                borderRadius: '0.375rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <button
                  className="small secondary"
                  onClick={handleBack}
                  disabled={pathHistory.length <= 1}
                >
                  ← Back
                </button>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>
                  {currentPath}
                </span>
              </div>

              {/* Selection Info */}
              {selectedFiles.length > 0 && (
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(37, 99, 235, 0.1)',
                  borderRadius: '0.375rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  color: 'var(--primary)'
                }}>
                  {selectedFiles.length} photo(s) selected
                </div>
              )}

              {/* File List */}
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {loading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)' }}>
                    Loading...
                  </div>
                ) : items.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)' }}>
                    No items in this folder
                  </div>
                ) : (
                  <>
                    {items.map((item, idx) => {
                      const isImage = item.type === 'file' && isImageFile(item.basename);
                      const isSelected = selectedFiles.some(f => f.filename === item.filename);

                      return (
                        <div
                          key={idx}
                          onClick={() => item.type === 'directory' ? handleNavigate(item) : handleSelectFile(item)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'var(--bg-light)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {isImage && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <span style={{ fontSize: '1.25rem' }}>{getFileIcon(item)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.875rem',
                              fontWeight: item.type === 'directory' ? '500' : 'normal',
                              color: 'var(--text-dark)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {item.basename}
                            </div>
                            {item.size && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.125rem' }}>
                                {formatFileSize(item.size)}
                              </div>
                            )}
                          </div>
                          {item.type === 'directory' && (
                            <span style={{ color: 'var(--text-light)' }}>→</span>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Select All Button */}
              {items.some(item => item.type === 'file' && isImageFile(item.basename)) && (
                <div style={{ marginTop: '1rem' }}>
                  <button className="small secondary" onClick={handleSelectAll}>
                    {selectedFiles.length === items.filter(item => item.type === 'file' && isImageFile(item.basename)).length
                      ? 'Deselect All'
                      : 'Select All Images'}
                  </button>
                </div>
              )}
            </div>

            <div className="wp-publish-footer">
              <button className="secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedFiles.length === 0}
              >
                Import {selectedFiles.length > 0 && `(${selectedFiles.length})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default kDriveImport;
