import { useState, useEffect } from 'react';
import { Button, Input, FormField, Skeleton } from '../common';
import toast from 'react-hot-toast';

interface Settings {
  aws_region: string;
  api_endpoint: string;
  websocket_endpoint: string;
  auto_approve_threshold: number;
  review_threshold: number;
  edit_version_retention_days: number;
  jwt_secret: string;
  filemage_api_token: string;
  filemage_api_url: string;
  filemage_watch_folders: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<Settings>({
    aws_region: 'eu-west-1',
    api_endpoint: '',
    websocket_endpoint: '',
    auto_approve_threshold: 85,
    review_threshold: 50,
    edit_version_retention_days: 90,
    jwt_secret: '',
    filemage_api_token: '',
    filemage_api_url: '',
    filemage_watch_folders: '',
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'filemage' | 'shortcodes' | 'help'>('general');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const current = window.vincoMAM?.settings || {};
      setSettings({
        aws_region: current.aws_region || 'eu-west-1',
        api_endpoint: current.api_endpoint || '',
        websocket_endpoint: current.websocket_endpoint || '',
        auto_approve_threshold: current.auto_approve_threshold || 85,
        review_threshold: current.review_threshold || 50,
        edit_version_retention_days: current.edit_version_retention_days || 90,
        jwt_secret: current.jwt_secret || '',
        filemage_api_token: current.filemage_api_token || '',
        filemage_api_url: current.filemage_api_url || '',
        filemage_watch_folders: current.filemage_watch_folders || '',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save via WordPress REST API custom endpoint
      const response = await fetch(window.vincoMAM?.apiRoot + 'settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.vincoMAM?.nonce || '',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      const result = await response.json();
      
      // Update local settings
      if (typeof window !== 'undefined' && window.vincoMAM) {
        window.vincoMAM.settings = result.settings || settings;
      }
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Vinco MAM Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('filemage')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'filemage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            FileMage FTP
          </button>
          <button
            onClick={() => setActiveTab('shortcodes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'shortcodes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Shortcodes
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'help'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Help
          </button>
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">AWS Configuration</h2>
            
            <div className="space-y-4">
              <Input
                label="AWS Region"
                type="text"
                value={settings.aws_region}
                onChange={(e) => handleChange('aws_region', e.target.value)}
                placeholder="eu-west-1"
              />

              <Input
                label="API Gateway Endpoint"
                type="url"
                value={settings.api_endpoint}
                onChange={(e) => handleChange('api_endpoint', e.target.value)}
                placeholder="https://xxxxx.execute-api.eu-west-1.amazonaws.com/prod"
                helperText="Get this from AWS CDK deployment outputs"
              />

              <Input
                label="WebSocket Endpoint"
                type="url"
                value={settings.websocket_endpoint}
                onChange={(e) => handleChange('websocket_endpoint', e.target.value)}
                placeholder="wss://xxxxx.execute-api.eu-west-1.amazonaws.com/prod"
                helperText="Optional - for real-time updates"
              />

              <Input
                label="JWT Secret"
                type="password"
                value={settings.jwt_secret}
                onChange={(e) => handleChange('jwt_secret', e.target.value)}
                helperText="Shared secret for JWT token signing"
              />
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Recognition Thresholds</h2>
            
            <div className="space-y-4">
              <Input
                label="Auto-Approve Threshold (%)"
                type="number"
                min="0"
                max="100"
                value={settings.auto_approve_threshold.toString()}
                onChange={(e) => handleChange('auto_approve_threshold', parseInt(e.target.value))}
                helperText="Confidence score above which recognition is auto-approved"
              />

              <Input
                label="Review Threshold (%)"
                type="number"
                min="0"
                max="100"
                value={settings.review_threshold.toString()}
                onChange={(e) => handleChange('review_threshold', parseInt(e.target.value))}
                helperText="Confidence score above which recognition goes to review queue"
              />

              <Input
                label="Edit Version Retention (days)"
                type="number"
                min="1"
                max="365"
                value={settings.edit_version_retention_days.toString()}
                onChange={(e) => handleChange('edit_version_retention_days', parseInt(e.target.value))}
                helperText="How long to keep edit history"
              />
            </div>
          </div>
        </div>
      )}

      {/* FileMage Settings */}
      {activeTab === 'filemage' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">FileMage FTP Configuration</h2>
            
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>FileMage API Token:</strong> Create an API token in FileMage by going to Settings → API Tokens → Add.
                See <a href="https://docs.filemage.io/administrators.html#api-tokens" target="_blank" rel="noopener noreferrer" className="underline">FileMage Documentation</a> for details.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="FileMage API URL"
                type="url"
                value={settings.filemage_api_url}
                onChange={(e) => handleChange('filemage_api_url', e.target.value)}
                placeholder="https://your-filemage-instance.com/api"
                helperText="Base URL of your FileMage instance API"
              />

              <Input
                label="FileMage API Token"
                type="password"
                value={settings.filemage_api_token}
                onChange={(e) => handleChange('filemage_api_token', e.target.value)}
                placeholder="Enter your FileMage API token"
                helperText="API token from FileMage Settings → API Tokens"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Watch Folders (one per line)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={6}
                  value={settings.filemage_watch_folders}
                  onChange={(e) => handleChange('filemage_watch_folders', e.target.value)}
                  placeholder="/photographers/photographer1&#10;/photographers/photographer2&#10;/events/event-2024"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter one folder path per line. Folders will be monitored for new uploads.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shortcodes */}
      {activeTab === 'shortcodes' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Shortcode Reference</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Gallery Shortcode</h3>
                <p className="text-sm text-gray-600 mb-2">Display image galleries on frontend pages.</p>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`[vinco_gallery event_id="123" photographer_id="456" limit="20" columns="4" lightbox="true"]

Parameters:
- event_id: Filter by event ID
- photographer_id: Filter by photographer ID
- album_id: Filter by album ID
- limit: Number of images (default: 20)
- columns: Grid columns 1-6 (default: 4)
- lightbox: Enable lightbox (default: true)
- show_metadata: Show image titles (default: false)
- public: Allow public access (default: false)`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Album Shortcode</h3>
                <p className="text-sm text-gray-600 mb-2">Display a specific album.</p>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`[vinco_album id="album-123" columns="3" lightbox="true"]

Parameters:
- id: Album ID (required)
- columns: Grid columns (default: 4)
- lightbox: Enable lightbox (default: true)
- public: Allow public access (default: false)`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Single Image Shortcode</h3>
                <p className="text-sm text-gray-600 mb-2">Display a single image.</p>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`[vinco_image id="img-123" size="large" caption="true" link="true"]

Parameters:
- id: Image ID (required)
- size: thumbnail, medium, large, original (default: large)
- caption: Show caption (default: false)
- link: Link to full size (default: false)
- public: Allow public access (default: false)`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Athlete Gallery Shortcode</h3>
                <p className="text-sm text-gray-600 mb-2">Display images of a specific athlete.</p>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`[vinco_athlete_gallery athlete_id="123" limit="10" columns="3"]

Parameters:
- athlete_id: Athlete ID (required)
- limit: Number of images (default: 10)
- columns: Grid columns (default: 3)
- lightbox: Enable lightbox (default: true)
- public: Allow public access (default: false)`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help */}
      {activeTab === 'help' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
            
            <div className="space-y-4 prose max-w-none">
              <div>
                <h3 className="text-lg font-semibold">1. Deploy AWS Infrastructure</h3>
                <p className="text-sm text-gray-600">
                  Before using the plugin, deploy the AWS infrastructure:
                </p>
                <pre className="bg-gray-100 p-4 rounded text-sm">
{`cd aws
./deploy.sh`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold">2. Configure Settings</h3>
                <p className="text-sm text-gray-600">
                  Enter your AWS API Gateway endpoint and WebSocket endpoint (optional) in the General tab above.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold">3. Create Rekognition Collection</h3>
                <p className="text-sm text-gray-600">
                  Create the Rekognition collection for athlete facial recognition:
                </p>
                <pre className="bg-gray-100 p-4 rounded text-sm">
{`aws rekognition create-collection \\
  --collection-id vinco-athletes \\
  --region eu-west-1`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold">4. Configure FileMage FTP</h3>
                <p className="text-sm text-gray-600">
                  If using FileMage for FTP uploads:
                </p>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>Get your FileMage API token from Settings → API Tokens</li>
                  <li>Enter the API URL and token in the FileMage tab</li>
                  <li>Configure which folders to watch for uploads</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-semibold">5. Use Shortcodes</h3>
                <p className="text-sm text-gray-600">
                  Add shortcodes to WordPress pages to display galleries on the frontend. See the Shortcodes tab for examples.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
