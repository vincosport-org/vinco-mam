import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal } from '../common';
import toast from 'react-hot-toast';

interface Settings {
  auto_approve_threshold: number;
  review_threshold: number;
  edit_version_retention_days: number;
  filemage_api_token: string;
  filemage_watch_folders: string;
}

interface FTPUser {
  id: number;
  username: string;
  wpUserId?: number;
  wpUserName?: string;
  wpUserEmail?: string;
  folderPath: string;
  defaultCopyright?: string;
  defaultCredit?: string;
  totalUploads: number;
  createdAt: string;
  lastLogin?: string;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Settings>({
    auto_approve_threshold: 85,
    review_threshold: 50,
    edit_version_retention_days: 90,
    filemage_api_token: '',
    filemage_watch_folders: '',
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'ftpusers' | 'filemage' | 'shortcodes' | 'help'>('general');
  const [repairing, setRepairing] = useState(false);

  // FTP User management state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<FTPUser | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    wpUserId: '',
    folderPath: '',
    defaultCopyright: '',
    defaultCredit: '',
  });

  // Fetch FTP users
  const { data: ftpUsersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['ftp-users'],
    queryFn: async () => {
      const response = await fetch(window.vincoMAM?.apiRoot + 'ftp-users', {
        headers: {
          'X-WP-Nonce': window.vincoMAM?.nonce || '',
        },
      });
      if (!response.ok) throw new Error('Failed to load FTP users');
      return response.json();
    },
    enabled: activeTab === 'ftpusers',
  });

  // Fetch WordPress users for linking
  const { data: wpUsersData } = useQuery({
    queryKey: ['wp-users'],
    queryFn: async () => {
      const response = await fetch(window.vincoMAM?.apiRoot + 'wp-users', {
        headers: {
          'X-WP-Nonce': window.vincoMAM?.nonce || '',
        },
      });
      if (!response.ok) throw new Error('Failed to load WordPress users');
      return response.json();
    },
    enabled: showCreateUserModal || editingUser !== null,
  });

  // Create FTP user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const response = await fetch(window.vincoMAM?.apiRoot + 'ftp-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.vincoMAM?.nonce || '',
        },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create FTP user');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('FTP user created successfully');
      queryClient.invalidateQueries({ queryKey: ['ftp-users'] });
      setShowCreateUserModal(false);
      setNewUser({
        username: '',
        password: '',
        wpUserId: '',
        folderPath: '',
        defaultCopyright: '',
        defaultCredit: '',
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update FTP user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...userData }: { id: number } & Partial<typeof newUser>) => {
      const response = await fetch(window.vincoMAM?.apiRoot + `ftp-users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.vincoMAM?.nonce || '',
        },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update FTP user');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('FTP user updated successfully');
      queryClient.invalidateQueries({ queryKey: ['ftp-users'] });
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete FTP user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(window.vincoMAM?.apiRoot + `ftp-users/${id}`, {
        method: 'DELETE',
        headers: {
          'X-WP-Nonce': window.vincoMAM?.nonce || '',
        },
      });
      if (!response.ok) throw new Error('Failed to delete FTP user');
      return response.json();
    },
    onSuccess: () => {
      toast.success('FTP user deleted');
      queryClient.invalidateQueries({ queryKey: ['ftp-users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const current = window.vincoMAM?.settings || {};
      setSettings({
        auto_approve_threshold: current.auto_approve_threshold || 85,
        review_threshold: current.review_threshold || 50,
        edit_version_retention_days: current.edit_version_retention_days || 90,
        filemage_api_token: current.filemage_api_token || '',
        filemage_watch_folders: current.filemage_watch_folders || '',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
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

  const handleRepairPages = async () => {
    setRepairing(true);
    try {
      const response = await fetch(window.vincoMAM?.apiRoot + 'repair-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.vincoMAM?.nonce || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to repair pages');
      }

      const result = await response.json();
      toast.success(result.message || 'Pages repaired successfully!');
    } catch (error) {
      console.error('Error repairing pages:', error);
      toast.error('Error repairing pages. Please try again.');
    } finally {
      setRepairing(false);
    }
  };

  const handleCreateUser = () => {
    if (!newUser.username.trim()) {
      toast.error('Username is required');
      return;
    }
    if (!newUser.password.trim()) {
      toast.error('Password is required');
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleDeleteUser = (user: FTPUser) => {
    if (confirm(`Are you sure you want to delete FTP user "${user.username}"? This cannot be undone.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const ftpUsers: FTPUser[] = ftpUsersData?.users || [];
  const wpUsers = wpUsersData?.users || [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Vinco MAM Settings</h1>

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
            onClick={() => setActiveTab('ftpusers')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ftpusers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            FTP Users
          </button>
          <button
            onClick={() => setActiveTab('filemage')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'filemage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            FileMage Config
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
          {/* AWS Configuration Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-green-800">AWS Configuration</h3>
                <p className="text-sm text-green-700 mt-1">
                  AWS endpoints, S3 buckets, DynamoDB tables, and JWT authentication are all preconfigured in the plugin.
                  No additional AWS configuration is required.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recognition Thresholds</h2>

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

      {/* FTP Users */}
      {activeTab === 'ftpusers' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">FTP Users</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage photographer FTP accounts for uploading images via ftp.vincosport.com
                </p>
              </div>
              <Button onClick={() => setShowCreateUserModal(true)}>
                Add FTP User
              </Button>
            </div>

            {loadingUsers ? (
              <div className="text-center py-8 text-gray-500">Loading FTP users...</div>
            ) : ftpUsers.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No FTP users</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new FTP user for photographers.</p>
                <div className="mt-6">
                  <Button onClick={() => setShowCreateUserModal(true)}>
                    Add FTP User
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WordPress User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Folder Path</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploads</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ftpUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.wpUserName ? (
                            <div>
                              <div className="text-sm text-gray-900">{user.wpUserName}</div>
                              <div className="text-xs text-gray-500">{user.wpUserEmail}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Not linked</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{user.folderPath || '/'}</code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.totalUploads || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* FTP Connection Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">FTP Connection Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <strong>Server:</strong> ftp.vincosport.com
              </div>
              <div>
                <strong>Port:</strong> 21 (FTP) / 990 (FTPS)
              </div>
              <div>
                <strong>Protocol:</strong> FTPS (FTP over TLS)
              </div>
              <div>
                <strong>Mode:</strong> Passive
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FileMage Settings */}
      {activeTab === 'filemage' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">FileMage FTP Configuration</h2>

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>FileMage Server:</strong> <code className="bg-blue-100 px-1 rounded">https://ftp.vincosport.com</code>
              </p>
              <p className="text-sm text-blue-800 mt-2">
                <strong>API Token:</strong> Create an API token in FileMage by going to Settings → API Tokens → Add.
                See <a href="https://docs.filemage.io/administrators.html#api-tokens" target="_blank" rel="noopener noreferrer" className="underline">FileMage Documentation</a> for details.
              </p>
            </div>

            <div className="space-y-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Shortcode Reference</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Gallery Shortcode</h3>
                <p className="text-sm text-gray-600 mb-2">Display image galleries on frontend pages.</p>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto text-gray-800">
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
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Album Shortcode</h3>
                <p className="text-sm text-gray-600 mb-2">Display a specific album.</p>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto text-gray-800">
{`[vinco_album id="album-123" columns="3" lightbox="true"]

Parameters:
- id: Album ID (required)
- columns: Grid columns (default: 4)
- lightbox: Enable lightbox (default: true)
- public: Allow public access (default: false)`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Single Image Shortcode</h3>
                <p className="text-sm text-gray-600 mb-2">Display a single image.</p>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto text-gray-800">
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
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Athlete Gallery Shortcode</h3>
                <p className="text-sm text-gray-600 mb-2">Display images of a specific athlete.</p>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto text-gray-800">
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>

            <div className="space-y-4 prose max-w-none">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">1. AWS Infrastructure</h3>
                <p className="text-sm text-gray-600">
                  The AWS infrastructure (API Gateway, S3, DynamoDB, Lambda) is preconfigured. No action required.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800">2. Create FTP Users</h3>
                <p className="text-sm text-gray-600">
                  Go to the FTP Users tab to create accounts for photographers. Each user gets their own folder on ftp.vincosport.com.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800">3. Configure FileMage API</h3>
                <p className="text-sm text-gray-600">
                  Enter your FileMage API token in the FileMage Config tab to enable automated processing of uploaded images.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800">4. Create Rekognition Collection</h3>
                <p className="text-sm text-gray-600">
                  Create the Rekognition collection for athlete facial recognition (one-time setup):
                </p>
                <pre className="bg-gray-100 p-4 rounded text-sm text-gray-800">
{`aws rekognition create-collection \\
  --collection-id vinco-athletes \\
  --region eu-west-1`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800">5. Use Shortcodes</h3>
                <p className="text-sm text-gray-600">
                  Add shortcodes to WordPress pages to display galleries on the frontend. See the Shortcodes tab for examples.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800">6. Frontend Pages</h3>
                <p className="text-sm text-gray-600">
                  The plugin automatically creates these frontend pages on activation:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                  <li><strong>/vinco-gallery</strong> - Public photo gallery</li>
                  <li><strong>/vinco-albums</strong> - Album browser</li>
                  <li><strong>/vinco-athletes</strong> - Athlete profiles</li>
                  <li><strong>/vinco-events</strong> - Event galleries</li>
                  <li><strong>/vinco-search</strong> - Photo search</li>
                  <li><strong>/vinco-tags</strong> - Browse by category</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Repair Pages */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Repair Frontend Pages</h2>
            <p className="text-sm text-gray-600 mb-4">
              If frontend pages (Gallery, Albums, Athletes, Events, Search, Tags) are missing or were accidentally deleted,
              click the button below to recreate them.
            </p>
            <Button onClick={handleRepairPages} loading={repairing}>
              Repair Pages
            </Button>
          </div>
        </div>
      )}

      {/* Save Button - only show on tabs that have saveable settings */}
      {(activeTab === 'general' || activeTab === 'filemage') && (
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} loading={saving}>
            Save Settings
          </Button>
        </div>
      )}

      {/* Create FTP User Modal */}
      <Modal
        isOpen={showCreateUserModal}
        onClose={() => {
          setShowCreateUserModal(false);
          setNewUser({
            username: '',
            password: '',
            wpUserId: '',
            folderPath: '',
            defaultCopyright: '',
            defaultCredit: '',
          });
        }}
        title="Create FTP User"
      >
        <div className="space-y-4">
          <Input
            label="FTP Username *"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            placeholder="e.g., john.photographer"
            required
          />
          <Input
            label="Password *"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            placeholder="Enter a secure password"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link to WordPress User
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={newUser.wpUserId}
              onChange={(e) => setNewUser({ ...newUser, wpUserId: e.target.value })}
            >
              <option value="">-- Select WordPress User (optional) --</option>
              {wpUsers.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.display_name} ({user.user_email})
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Link to a WordPress user to sync permissions and display info.
            </p>
          </div>
          <Input
            label="Folder Path"
            value={newUser.folderPath}
            onChange={(e) => setNewUser({ ...newUser, folderPath: e.target.value })}
            placeholder="/photographers/username"
            helperText="The folder this user can access. Leave blank for root."
          />
          <Input
            label="Default Copyright"
            value={newUser.defaultCopyright}
            onChange={(e) => setNewUser({ ...newUser, defaultCopyright: e.target.value })}
            placeholder="© 2024 Photographer Name"
            helperText="Default copyright text for uploaded images."
          />
          <Input
            label="Default Credit"
            value={newUser.defaultCredit}
            onChange={(e) => setNewUser({ ...newUser, defaultCredit: e.target.value })}
            placeholder="Photo by Photographer Name"
            helperText="Default credit line for uploaded images."
          />
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateUserModal(false);
                setNewUser({
                  username: '',
                  password: '',
                  wpUserId: '',
                  folderPath: '',
                  defaultCopyright: '',
                  defaultCredit: '',
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              loading={createUserMutation.isPending}
            >
              Create User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit FTP User Modal */}
      <Modal
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        title="Edit FTP User"
      >
        {editingUser && (
          <div className="space-y-4">
            <Input
              label="FTP Username"
              value={editingUser.username}
              disabled
              helperText="Username cannot be changed after creation."
            />
            <Input
              label="New Password"
              type="password"
              placeholder="Leave blank to keep current password"
              onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value } as any)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link to WordPress User
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={editingUser.wpUserId || ''}
                onChange={(e) => setEditingUser({ ...editingUser, wpUserId: e.target.value ? parseInt(e.target.value) : undefined })}
              >
                <option value="">-- Not linked --</option>
                {wpUsers.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.display_name} ({user.user_email})
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Folder Path"
              value={editingUser.folderPath || ''}
              onChange={(e) => setEditingUser({ ...editingUser, folderPath: e.target.value })}
              placeholder="/photographers/username"
            />
            <Input
              label="Default Copyright"
              value={editingUser.defaultCopyright || ''}
              onChange={(e) => setEditingUser({ ...editingUser, defaultCopyright: e.target.value })}
              placeholder="© 2024 Photographer Name"
            />
            <Input
              label="Default Credit"
              value={editingUser.defaultCredit || ''}
              onChange={(e) => setEditingUser({ ...editingUser, defaultCredit: e.target.value })}
              placeholder="Photo by Photographer Name"
            />
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const { id, ...userData } = editingUser as any;
                  updateUserMutation.mutate({ id, ...userData });
                }}
                loading={updateUserMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
