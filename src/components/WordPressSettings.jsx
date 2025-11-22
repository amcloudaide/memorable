import React, { useState, useEffect } from 'react';

function WordPressSettings({ onClose }) {
  const [settings, setSettings] = useState({
    url: '',
    username: '',
    appPassword: ''
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const saved = await window.electron.wpGetSettings();
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
    if (!settings.url || !settings.username || !settings.appPassword) {
      setTestResult({ success: false, error: 'Please fill in all fields' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    // Save settings first so the test uses them
    await window.electron.wpSaveSettings(settings);

    const result = await window.electron.wpTestConnection();
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await window.electron.wpSaveSettings(settings);
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
          <h3>WordPress Settings</h3>
          <button className="secondary small" onClick={onClose}>Close</button>
        </div>

        <div className="wp-settings-content">
          <div className="wp-settings-info">
            <p>Connect to your WordPress site to publish photos directly.</p>
            <p className="wp-settings-hint">
              To create an Application Password: Go to WordPress Admin &gt; Users &gt; Profile &gt; Application Passwords
            </p>
          </div>

          <div className="wp-settings-field">
            <label>WordPress Site URL</label>
            <input
              type="url"
              name="url"
              value={settings.url}
              onChange={handleChange}
              placeholder="https://www.numnumfun.com"
            />
          </div>

          <div className="wp-settings-field">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={settings.username}
              onChange={handleChange}
              placeholder="Your WordPress username"
            />
          </div>

          <div className="wp-settings-field">
            <label>Application Password</label>
            <input
              type="password"
              name="appPassword"
              value={settings.appPassword}
              onChange={handleChange}
              placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
            />
            <span className="field-hint">Found in Users &gt; Profile &gt; Application Passwords</span>
          </div>

          {testResult && (
            <div className={`wp-test-result ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success
                ? `Connected successfully as "${testResult.user}"`
                : `Connection failed: ${testResult.error}`}
            </div>
          )}
        </div>

        <div className="wp-settings-footer">
          <button
            className="secondary"
            onClick={handleTest}
            disabled={testing || !settings.url || !settings.username || !settings.appPassword}
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

export default WordPressSettings;
