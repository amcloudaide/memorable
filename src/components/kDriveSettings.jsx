import React, { useState, useEffect } from 'react';

function kDriveSettings({ onClose }) {
  const [settings, setSettings] = useState({
    driveId: '',
    email: '',
    password: ''
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const saved = await window.electron.kDriveGetSettings();
    if (saved) {
      setSettings(saved);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!settings.driveId || !settings.email || !settings.password) {
      setTestResult({ success: false, error: 'Please fill in all fields' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    // Save settings first so the test uses them
    await window.electron.kDriveSaveSettings(settings);

    const result = await window.electron.kDriveTestConnection();
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await window.electron.kDriveSaveSettings(settings);
    setSaving(false);

    if (result.success) {
      onClose();
    } else {
      alert('Failed to save settings: ' + result.error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="wp-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wp-settings-header">
          <h3>kDrive Settings</h3>
          <button className="secondary small" onClick={onClose}>Close</button>
        </div>

        <div className="wp-settings-content">
          <div className="wp-settings-info">
            <p>Connect to your Infomaniak kDrive to import photos directly.</p>
            <p className="wp-settings-hint">
              Use an Application Password for enhanced security with two-factor authentication.
            </p>
          </div>

          <div className="wp-settings-field">
            <label>kDrive ID</label>
            <input
              type="text"
              name="driveId"
              value={settings.driveId}
              onChange={handleChange}
              placeholder="123456"
            />
            <span className="field-hint">
              Find in kDrive settings or URL: https://[driveId].connect.kdrive.infomaniak.com
            </span>
          </div>

          <div className="wp-settings-field">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={settings.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
            />
          </div>

          <div className="wp-settings-field">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={settings.password}
              onChange={handleChange}
              placeholder="Application password or account password"
            />
            <span className="field-hint">
              Recommended: Create an Application Password in your Infomaniak account settings
            </span>
          </div>

          {testResult && (
            <div className={`wp-test-result ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success
                ? `Connected successfully! Found ${testResult.fileCount || 0} items.`
                : `Connection failed: ${testResult.error}`}
            </div>
          )}

          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-light)', borderRadius: '0.375rem', fontSize: '0.75rem' }}>
            <strong>How to find your kDrive ID:</strong>
            <ol style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
              <li>Log in to your kDrive at <a href="https://www.infomaniak.com/goto/kdrive" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>www.infomaniak.com</a></li>
              <li>Look at the URL in your browser</li>
              <li>The Drive ID is the <strong>second number</strong> in the URL</li>
              <li>Example: https://ksuite.infomaniak.com/1423721/kdrive/app/drive/<strong>123456</strong>/files/93790</li>
              <li>In this example, the Drive ID is "<strong>123456</strong>" (not 1423721)</li>
            </ol>
          </div>
        </div>

        <div className="wp-settings-footer">
          <button
            className="secondary"
            onClick={handleTest}
            disabled={testing || !settings.driveId || !settings.email || !settings.password}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default kDriveSettings;
