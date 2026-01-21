<?php
// includes/class-vinco-api.php

class Vinco_MAM_API {

    private $aws_endpoint;
    private $aws_available = null;

    public function __construct() {
        // Use hardcoded config instead of database settings
        $this->aws_endpoint = Vinco_MAM_Config::get_api_endpoint();
    }

    public function register_routes() {
        // Settings endpoint - MUST be registered BEFORE the catch-all route
        register_rest_route('vinco-mam/v1', '/settings', [
            'methods' => ['GET', 'POST'],
            'callback' => [$this, 'handle_settings'],
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ]);

        // Export presets endpoint
        register_rest_route('vinco-mam/v1', '/export-presets', [
            'methods' => ['GET'],
            'callback' => [$this, 'handle_export_presets'],
            'permission_callback' => function() {
                return is_user_logged_in();
            },
        ]);

        // FTP Users management endpoints
        register_rest_route('vinco-mam/v1', '/ftp-users', [
            'methods' => ['GET', 'POST'],
            'callback' => [$this, 'handle_ftp_users'],
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ]);

        register_rest_route('vinco-mam/v1', '/ftp-users/(?P<id>\d+)', [
            'methods' => ['GET', 'PUT', 'DELETE'],
            'callback' => [$this, 'handle_ftp_user'],
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ]);

        // WordPress users list (for linking FTP accounts)
        register_rest_route('vinco-mam/v1', '/wp-users', [
            'methods' => ['GET'],
            'callback' => [$this, 'handle_wp_users'],
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ]);

        // Local albums endpoint (fallback when AWS unavailable)
        register_rest_route('vinco-mam/v1', '/local/albums', [
            'methods' => ['GET', 'POST'],
            'callback' => [$this, 'handle_local_albums'],
            'permission_callback' => function() {
                return is_user_logged_in();
            },
        ]);

        register_rest_route('vinco-mam/v1', '/local/albums/(?P<id>[a-zA-Z0-9_-]+)', [
            'methods' => ['GET', 'PUT', 'DELETE'],
            'callback' => [$this, 'handle_local_album'],
            'permission_callback' => function() {
                return is_user_logged_in();
            },
        ]);

        // Local images endpoint (fallback when AWS unavailable)
        register_rest_route('vinco-mam/v1', '/local/images', [
            'methods' => ['GET'],
            'callback' => [$this, 'handle_local_images'],
            'permission_callback' => function() {
                return true; // Public access for viewing
            },
        ]);

        // Repair pages endpoint
        register_rest_route('vinco-mam/v1', '/repair-pages', [
            'methods' => ['POST'],
            'callback' => [$this, 'handle_repair_pages'],
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ]);

        // Proxy all other requests to AWS API Gateway (catch-all - must be last)
        register_rest_route('vinco-mam/v1', '/(?P<path>.+)', [
            'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
            'callback' => [$this, 'proxy_request'],
            'permission_callback' => [$this, 'check_permission'],
        ]);
    }

    /**
     * Handle FTP users list and create
     */
    public function handle_ftp_users($request) {
        global $wpdb;
        $table = $wpdb->prefix . 'vinco_photographers';

        if ($request->get_method() === 'GET') {
            $users = $wpdb->get_results("
                SELECT p.*, u.display_name as wpUserName, u.user_email as wpUserEmail
                FROM {$table} p
                LEFT JOIN {$wpdb->users} u ON p.user_id = u.ID
                ORDER BY p.created_at DESC
            ", ARRAY_A);

            $formatted = array_map(function($u) {
                return [
                    'id' => (int)$u['id'],
                    'username' => $u['ftp_username'],
                    'wpUserId' => $u['user_id'] ? (int)$u['user_id'] : null,
                    'wpUserName' => $u['wpUserName'],
                    'wpUserEmail' => $u['wpUserEmail'],
                    'folderPath' => $u['ftp_folder_path'] ?: '/',
                    'defaultCopyright' => $u['default_copyright'],
                    'defaultCredit' => $u['default_credit'],
                    'totalUploads' => (int)$u['total_uploads'],
                    'createdAt' => $u['created_at'],
                ];
            }, $users ?: []);

            return new WP_REST_Response(['users' => $formatted], 200);
        }

        // POST - create new FTP user
        $data = $request->get_json_params();

        if (empty($data['username'])) {
            return new WP_Error('missing_username', 'Username is required', ['status' => 400]);
        }
        if (empty($data['password'])) {
            return new WP_Error('missing_password', 'Password is required', ['status' => 400]);
        }

        // Check if username already exists
        $exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table} WHERE ftp_username = %s",
            $data['username']
        ));

        if ($exists) {
            return new WP_Error('username_exists', 'FTP username already exists', ['status' => 400]);
        }

        // Create FTP user in FileMage (if API token is configured)
        $filemage_created = $this->create_filemage_user($data['username'], $data['password'], $data['folderPath'] ?? '/');

        // Insert into database
        $result = $wpdb->insert($table, [
            'user_id' => !empty($data['wpUserId']) ? (int)$data['wpUserId'] : null,
            'ftp_username' => sanitize_text_field($data['username']),
            'ftp_folder_path' => sanitize_text_field($data['folderPath'] ?? '/'),
            'default_copyright' => sanitize_text_field($data['defaultCopyright'] ?? ''),
            'default_credit' => sanitize_text_field($data['defaultCredit'] ?? ''),
        ]);

        if ($result === false) {
            return new WP_Error('db_error', 'Failed to create FTP user', ['status' => 500]);
        }

        $id = $wpdb->insert_id;

        return new WP_REST_Response([
            'success' => true,
            'id' => $id,
            'filemageCreated' => $filemage_created,
        ], 201);
    }

    /**
     * Handle single FTP user operations
     */
    public function handle_ftp_user($request) {
        global $wpdb;
        $table = $wpdb->prefix . 'vinco_photographers';
        $id = (int)$request->get_param('id');

        if ($request->get_method() === 'GET') {
            $user = $wpdb->get_row($wpdb->prepare(
                "SELECT p.*, u.display_name as wpUserName, u.user_email as wpUserEmail
                FROM {$table} p
                LEFT JOIN {$wpdb->users} u ON p.user_id = u.ID
                WHERE p.id = %d",
                $id
            ), ARRAY_A);

            if (!$user) {
                return new WP_Error('not_found', 'FTP user not found', ['status' => 404]);
            }

            return new WP_REST_Response(['user' => [
                'id' => (int)$user['id'],
                'username' => $user['ftp_username'],
                'wpUserId' => $user['user_id'] ? (int)$user['user_id'] : null,
                'wpUserName' => $user['wpUserName'],
                'wpUserEmail' => $user['wpUserEmail'],
                'folderPath' => $user['ftp_folder_path'] ?: '/',
                'defaultCopyright' => $user['default_copyright'],
                'defaultCredit' => $user['default_credit'],
                'totalUploads' => (int)$user['total_uploads'],
                'createdAt' => $user['created_at'],
            ]], 200);
        }

        if ($request->get_method() === 'PUT') {
            $data = $request->get_json_params();

            $update_data = [];
            if (isset($data['wpUserId'])) {
                $update_data['user_id'] = !empty($data['wpUserId']) ? (int)$data['wpUserId'] : null;
            }
            if (isset($data['folderPath'])) {
                $update_data['ftp_folder_path'] = sanitize_text_field($data['folderPath']);
            }
            if (isset($data['defaultCopyright'])) {
                $update_data['default_copyright'] = sanitize_text_field($data['defaultCopyright']);
            }
            if (isset($data['defaultCredit'])) {
                $update_data['default_credit'] = sanitize_text_field($data['defaultCredit']);
            }

            if (!empty($update_data)) {
                $wpdb->update($table, $update_data, ['id' => $id]);
            }

            // Update password in FileMage if provided
            if (!empty($data['password'])) {
                $user = $wpdb->get_row($wpdb->prepare("SELECT ftp_username FROM {$table} WHERE id = %d", $id));
                if ($user) {
                    $this->update_filemage_user_password($user->ftp_username, $data['password']);
                }
            }

            return new WP_REST_Response(['success' => true], 200);
        }

        if ($request->get_method() === 'DELETE') {
            // Get username before deleting
            $user = $wpdb->get_row($wpdb->prepare("SELECT ftp_username FROM {$table} WHERE id = %d", $id));

            // Delete from database
            $wpdb->delete($table, ['id' => $id]);

            // Delete from FileMage
            if ($user) {
                $this->delete_filemage_user($user->ftp_username);
            }

            return new WP_REST_Response(['success' => true], 200);
        }

        return new WP_Error('invalid_method', 'Invalid method', ['status' => 405]);
    }

    /**
     * Get WordPress users for linking
     */
    public function handle_wp_users($request) {
        $users = get_users([
            'orderby' => 'display_name',
            'order' => 'ASC',
            'number' => 100,
        ]);

        $formatted = array_map(function($u) {
            return [
                'id' => $u->ID,
                'display_name' => $u->display_name,
                'user_email' => $u->user_email,
                'roles' => $u->roles,
            ];
        }, $users);

        return new WP_REST_Response(['users' => $formatted], 200);
    }

    /**
     * Create FileMage FTP user via API
     */
    private function create_filemage_user($username, $password, $folder_path) {
        $settings = get_option('vinco_mam_settings', []);
        $api_token = $settings['filemage_api_token'] ?? '';

        if (empty($api_token)) {
            return false; // FileMage not configured
        }

        $response = wp_remote_post(Vinco_MAM_Config::FILEMAGE_API_URL . '/users', [
            'headers' => [
                'Authorization' => 'Bearer ' . $api_token,
                'Content-Type' => 'application/json',
            ],
            'body' => json_encode([
                'username' => $username,
                'password' => $password,
                'homeDirectory' => $folder_path,
                'enabled' => true,
            ]),
            'timeout' => 10,
        ]);

        return !is_wp_error($response) && wp_remote_retrieve_response_code($response) < 300;
    }

    /**
     * Update FileMage user password
     */
    private function update_filemage_user_password($username, $password) {
        $settings = get_option('vinco_mam_settings', []);
        $api_token = $settings['filemage_api_token'] ?? '';

        if (empty($api_token)) {
            return false;
        }

        $response = wp_remote_request(Vinco_MAM_Config::FILEMAGE_API_URL . '/users/' . urlencode($username), [
            'method' => 'PATCH',
            'headers' => [
                'Authorization' => 'Bearer ' . $api_token,
                'Content-Type' => 'application/json',
            ],
            'body' => json_encode([
                'password' => $password,
            ]),
            'timeout' => 10,
        ]);

        return !is_wp_error($response) && wp_remote_retrieve_response_code($response) < 300;
    }

    /**
     * Delete FileMage user
     */
    private function delete_filemage_user($username) {
        $settings = get_option('vinco_mam_settings', []);
        $api_token = $settings['filemage_api_token'] ?? '';

        if (empty($api_token)) {
            return false;
        }

        $response = wp_remote_request(Vinco_MAM_Config::FILEMAGE_API_URL . '/users/' . urlencode($username), [
            'method' => 'DELETE',
            'headers' => [
                'Authorization' => 'Bearer ' . $api_token,
            ],
            'timeout' => 10,
        ]);

        return !is_wp_error($response) && wp_remote_retrieve_response_code($response) < 300;
    }

    /**
     * Handle local albums (fallback when AWS unavailable)
     */
    public function handle_local_albums($request) {
        $albums = get_option('vinco_local_albums', []);

        if ($request->get_method() === 'GET') {
            return new WP_REST_Response(['data' => ['albums' => array_values($albums)]], 200);
        }

        // POST - create album
        $data = $request->get_json_params();

        if (empty($data['name'])) {
            return new WP_Error('missing_name', 'Album name is required', ['status' => 400]);
        }

        $id = 'album_' . uniqid();
        $album = [
            'albumId' => $id,
            'name' => sanitize_text_field($data['name']),
            'description' => sanitize_text_field($data['description'] ?? ''),
            'isPublic' => !empty($data['isPublic']),
            'imageCount' => 0,
            'coverImageId' => null,
            'createdAt' => current_time('c'),
            'createdBy' => get_current_user_id(),
        ];

        $albums[$id] = $album;
        update_option('vinco_local_albums', $albums);

        return new WP_REST_Response(['data' => ['album' => $album]], 201);
    }

    /**
     * Handle single local album
     */
    public function handle_local_album($request) {
        $id = $request->get_param('id');
        $albums = get_option('vinco_local_albums', []);

        if (!isset($albums[$id])) {
            return new WP_Error('not_found', 'Album not found', ['status' => 404]);
        }

        if ($request->get_method() === 'GET') {
            return new WP_REST_Response(['data' => ['album' => $albums[$id]]], 200);
        }

        if ($request->get_method() === 'PUT') {
            $data = $request->get_json_params();

            if (isset($data['name'])) {
                $albums[$id]['name'] = sanitize_text_field($data['name']);
            }
            if (isset($data['description'])) {
                $albums[$id]['description'] = sanitize_text_field($data['description']);
            }
            if (isset($data['isPublic'])) {
                $albums[$id]['isPublic'] = !empty($data['isPublic']);
            }

            update_option('vinco_local_albums', $albums);
            return new WP_REST_Response(['data' => ['album' => $albums[$id]]], 200);
        }

        if ($request->get_method() === 'DELETE') {
            unset($albums[$id]);
            update_option('vinco_local_albums', $albums);
            return new WP_REST_Response(['success' => true], 200);
        }

        return new WP_Error('invalid_method', 'Invalid method', ['status' => 405]);
    }

    /**
     * Handle local images list (placeholder for when AWS is unavailable)
     */
    public function handle_local_images($request) {
        // Return empty list - images are stored in AWS S3
        // This endpoint exists for graceful degradation
        return new WP_REST_Response([
            'data' => [
                'images' => [],
                'total' => 0,
                'message' => 'Image storage requires AWS connection. Please ensure AWS API is properly configured.',
            ]
        ], 200);
    }

    public function handle_export_presets($request) {
        // Return default export presets (these could be stored in the database later)
        $presets = [
            [
                'presetId' => 'web-large',
                'name' => 'Web (Large)',
                'format' => 'JPEG',
                'quality' => 85,
                'maxPixels' => 2048 * 2048,
                'colorSpace' => 'SRGB',
                'metadata' => 'COPYRIGHT',
            ],
            [
                'presetId' => 'web-medium',
                'name' => 'Web (Medium)',
                'format' => 'JPEG',
                'quality' => 80,
                'maxPixels' => 1200 * 1200,
                'colorSpace' => 'SRGB',
                'metadata' => 'NONE',
            ],
            [
                'presetId' => 'social-media',
                'name' => 'Social Media',
                'format' => 'JPEG',
                'quality' => 90,
                'maxPixels' => 1080 * 1080,
                'colorSpace' => 'SRGB',
                'metadata' => 'NONE',
            ],
            [
                'presetId' => 'print-high',
                'name' => 'Print (High Quality)',
                'format' => 'TIFF',
                'quality' => 100,
                'colorSpace' => 'ADOBE_RGB',
                'metadata' => 'ALL',
            ],
        ];

        return new WP_REST_Response(['presets' => $presets], 200);
    }

    public function handle_settings($request) {
        if ($request->get_method() === 'GET') {
            $settings = get_option('vinco_mam_settings', []);
            return new WP_REST_Response($settings, 200);
        } else {
            // POST - save settings
            $input = $request->get_json_params();
            $settings_handler = new Vinco_MAM_Settings();
            $sanitized = $settings_handler->sanitize_settings($input);
            update_option('vinco_mam_settings', $sanitized);

            return new WP_REST_Response(['success' => true, 'settings' => $sanitized], 200);
        }
    }

    /**
     * Handle repair pages request
     * Recreates any missing Vinco pages
     */
    public function handle_repair_pages($request) {
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-pages.php';

        $repaired = Vinco_MAM_Pages::repair_pages();
        $all_pages = Vinco_MAM_Pages::get_all_page_urls();

        return new WP_REST_Response([
            'success' => true,
            'repaired' => $repaired,
            'pages' => $all_pages,
            'message' => empty($repaired) ? 'All pages already exist.' : 'Repaired ' . count($repaired) . ' page(s).',
        ], 200);
    }

    public function check_permission($request) {
        $path = $request->get_param('path');
        $method = $request->get_method();

        // Public endpoints (no auth required for viewing)
        $public_get_endpoints = [
            'images',
            'albums',
            'events',
            'search',
            'tags',
            'venues',
            'athletes',
        ];

        // Check if this is a public GET request
        if ($method === 'GET') {
            foreach ($public_get_endpoints as $endpoint) {
                if (strpos($path, $endpoint) === 0) {
                    // Allow public access for viewing galleries/images
                    return true;
                }
            }
        }

        // For authenticated endpoints, check login
        $authenticated_endpoints = [
            'validation',
            'users',
            'photographers',
        ];

        $requires_auth = false;
        foreach ($authenticated_endpoints as $endpoint) {
            if (strpos($path, $endpoint) === 0) {
                $requires_auth = true;
                break;
            }
        }

        // Also require auth for non-GET methods on protected endpoints
        if ($method !== 'GET' || $requires_auth) {
            if (!is_user_logged_in()) {
                return new WP_Error('unauthorized', 'You must be logged in', ['status' => 401]);
            }
        }

        // Check specific permissions based on endpoint and method
        // Note: Validation is now open to all authenticated users (matching Lambda logic)
        $permissions = [
            'PUT:images' => 'vinco_edit_images',
            'POST:images' => 'vinco_edit_images',
            'DELETE:images' => 'vinco_edit_images',
            // Validation accessible to all authenticated users - no capability required
            // 'GET:validation' => 'vinco_validate_recognition',
            // 'POST:validation' => 'vinco_validate_recognition',
            'POST:athletes' => 'vinco_manage_athletes',
            'PUT:athletes' => 'vinco_manage_athletes',
            // Albums management (content team and above)
            'POST:albums' => 'vinco_manage_content',
            'PUT:albums' => 'vinco_manage_content',
            'DELETE:albums' => 'vinco_manage_content',
            'GET:users' => 'vinco_manage_users',
            'POST:users' => 'vinco_manage_users',
            'GET:photographers' => 'vinco_manage_users',
            'POST:photographers' => 'vinco_manage_users',
            // Tags management (content team and above)
            'POST:tags' => 'vinco_manage_content',
            'PUT:tags' => 'vinco_manage_content',
            'DELETE:tags' => 'vinco_manage_content',
            // Tagging rules management (content team and above)
            'GET:tagging-rules' => 'vinco_manage_content',
            'POST:tagging-rules' => 'vinco_manage_content',
            'PUT:tagging-rules' => 'vinco_manage_content',
            'DELETE:tagging-rules' => 'vinco_manage_content',
        ];

        // Administrators always have full access
        if (current_user_can('manage_options')) {
            return true;
        }

        foreach ($permissions as $pattern => $cap) {
            [$reqMethod, $pathPrefix] = explode(':', $pattern);
            if ($method === $reqMethod && strpos($path, $pathPrefix) === 0) {
                if (!current_user_can($cap)) {
                    return new WP_Error('forbidden', 'Insufficient permissions', ['status' => 403]);
                }
                break;
            }
        }

        return true;
    }

    /**
     * Check if AWS API is available
     */
    private function is_aws_available() {
        if ($this->aws_available !== null) {
            return $this->aws_available;
        }

        // Check cached status (cache for 5 minutes)
        $cached = get_transient('vinco_aws_available');
        if ($cached !== false) {
            $this->aws_available = ($cached === 'yes');
            return $this->aws_available;
        }

        // Try a simple request to check availability
        $response = wp_remote_get($this->aws_endpoint . '/health', [
            'timeout' => 5,
            'headers' => ['Accept' => 'application/json'],
        ]);

        $this->aws_available = !is_wp_error($response) &&
                               wp_remote_retrieve_response_code($response) >= 200 &&
                               wp_remote_retrieve_response_code($response) < 500;

        set_transient('vinco_aws_available', $this->aws_available ? 'yes' : 'no', 300);

        return $this->aws_available;
    }

    public function proxy_request($request) {
        $path = $request->get_param('path');
        $method = $request->get_method();
        $body = $request->get_json_params();
        $query = $request->get_query_params();
        unset($query['path']);

        // Handle albums locally if AWS is not available or configured
        if (strpos($path, 'albums') === 0) {
            // Try AWS first, fall back to local
            $aws_response = $this->try_aws_request($path, $method, $body, $query);

            if (is_wp_error($aws_response) || $aws_response['status'] >= 500) {
                // Fall back to local albums
                if ($method === 'GET' && $path === 'albums') {
                    return $this->handle_local_albums($request);
                }
                if ($method === 'POST' && $path === 'albums') {
                    return $this->handle_local_albums($request);
                }
            }

            if (!is_wp_error($aws_response)) {
                return new WP_REST_Response($aws_response['body'], $aws_response['status']);
            }
        }

        // For images - return helpful error when AWS unavailable
        if (strpos($path, 'images') === 0 && $method === 'GET') {
            $aws_response = $this->try_aws_request($path, $method, $body, $query);

            if (is_wp_error($aws_response)) {
                return new WP_REST_Response([
                    'data' => [
                        'images' => [],
                        'total' => 0,
                    ],
                    'error' => 'AWS API connection failed. The CDK stack needs to be redeployed to configure API Gateway routes.',
                    'details' => $aws_response->get_error_message(),
                ], 200);
            }

            return new WP_REST_Response($aws_response['body'], $aws_response['status']);
        }

        // Standard proxy for other requests
        $aws_response = $this->try_aws_request($path, $method, $body, $query);

        if (is_wp_error($aws_response)) {
            return new WP_Error('proxy_error', $aws_response->get_error_message(), ['status' => 500]);
        }

        return new WP_REST_Response($aws_response['body'], $aws_response['status']);
    }

    /**
     * Try to make AWS request
     */
    private function try_aws_request($path, $method, $body, $query) {
        // Build URL
        $url = trailingslashit($this->aws_endpoint) . $path;
        if (!empty($query)) {
            $url .= '?' . http_build_query($query);
        }

        // Generate JWT for AWS
        $jwt = $this->generate_jwt();

        // Make request - try without Authorization header first (API Gateway might not require it)
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];

        // Only add Authorization if we have a JWT secret configured
        $jwt_secret = Vinco_MAM_Config::get_jwt_secret();
        if (!empty($jwt_secret)) {
            $headers['X-Vinco-Auth'] = $jwt; // Use custom header instead of Authorization
        }

        $response = wp_remote_request($url, [
            'method' => $method,
            'headers' => $headers,
            'body' => $method !== 'GET' ? json_encode($body) : null,
            'timeout' => 30,
        ]);

        if (is_wp_error($response)) {
            return $response;
        }

        $status_code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);

        return [
            'status' => $status_code,
            'body' => $body,
        ];
    }

    private function generate_jwt() {
        $user = wp_get_current_user();

        $payload = [
            'sub' => $user->ID ?: 0,
            'email' => $user->user_email ?: 'anonymous',
            'name' => $user->display_name ?: 'Anonymous',
            'role' => $this->get_vinco_role($user),
            'iat' => time(),
            'exp' => time() + 3600,
        ];

        $secret = Vinco_MAM_Config::get_jwt_secret();

        if (empty($secret)) {
            return '';
        }

        return $this->jwt_encode($payload, $secret);
    }

    private function jwt_encode($payload, $secret) {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];

        $segments = [];
        $segments[] = $this->base64url_encode(json_encode($header));
        $segments[] = $this->base64url_encode(json_encode($payload));

        $signing_input = implode('.', $segments);
        $signature = hash_hmac('sha256', $signing_input, $secret, true);
        $segments[] = $this->base64url_encode($signature);

        return implode('.', $segments);
    }

    private function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function get_vinco_role($user) {
        if (!$user || !$user->ID) return 'VIEWER';
        if (in_array('administrator', $user->roles)) return 'ADMIN';
        if (in_array('vinco_editor', $user->roles) || in_array('editor', $user->roles)) return 'EDITOR';
        if (in_array('vinco_content', $user->roles)) return 'CONTENT_TEAM';
        if (in_array('vinco_photographer', $user->roles)) return 'PHOTOGRAPHER';
        return 'VIEWER';
    }
}
