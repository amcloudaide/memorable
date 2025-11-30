import React, { useState, useEffect } from 'react';

function InstagramSettings({ onClose }) {
  const [settings, setSettings] = useState({
    accessToken: '',
    instagramUserId: ''
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const saved = await window.electron.igGetSettings();
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
    if (!settings.accessToken || !settings.instagramUserId) {
      setTestResult({ success: false, error: 'Please fill in all fields' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    // Save settings first so the test uses them
    await window.electron.igSaveSettings(settings);

    const result = await window.electron.igTestConnection();
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await window.electron.igSaveSettings(settings);
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
          <h3>Instagram Settings</h3>
          <button className="secondary small" onClick={onClose}>Close</button>
        </div>

        <div className="wp-settings-content">
          <div className="wp-settings-info">
            <p>Connect your Instagram Business account to publish photos directly.</p>
            <p className="wp-settings-hint">
              Note: You need an Instagram Business or Creator account connected to a Facebook Page.
            </p>
          </div>

          <div className="wp-settings-field">
            <label>Access Token</label>
            <input
              type="password"
              name="accessToken"
              value={settings.accessToken}
              onChange={handleChange}
              placeholder="Paste your Instagram Graph API access token"
            />
            <span className="field-hint">
              Get from <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Graph API Explorer</a>
            </span>
          </div>

          <div className="wp-settings-field">
            <label>Instagram User ID</label>
            <input
              type="text"
              name="instagramUserId"
              value={settings.instagramUserId}
              onChange={handleChange}
              placeholder="Your Instagram Business Account ID"
            />
            <span className="field-hint">Found in Facebook Business Manager</span>
          </div>

          {testResult && (
            <div className={`wp-test-result ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success
                ? `Connected successfully as "${testResult.username}"`
                : `Connection failed: ${testResult.error}`}
            </div>
          )}

          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-light)', borderRadius: '0.375rem', fontSize: '0.75rem' }}>
            <strong>How to get your credentials:</strong>
            <ol style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
              <li>Go to Facebook Graph API Explorer</li>
              <li>Select your app from the dropdown</li>
              <li>Add "instagram_basic", "instagram_content_publish" permissions</li>
              <li>Click "Generate Access Token"</li>
              <li>To get User ID: GET request to "me?fields=id,username" with Instagram Business Account</li>
            </ol>
          </div>
        </div>

        <div className="wp-settings-footer">
          <button
            className="secondary"
            onClick={handleTest}
            disabled={testing || !settings.accessToken || !settings.instagramUserId}
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

export default InstagramSettings;
