<?php
// includes/class-vinco-api.php

class Vinco_MAM_API {
    
    private $aws_endpoint;
    
    public function __construct() {
        $settings = get_option('vinco_mam_settings');
        $this->aws_endpoint = $settings['api_endpoint'] ?? '';
    }
    
    public function register_routes() {
        // Proxy all requests to AWS API Gateway
        register_rest_route('vinco-mam/v1', '/(?P<path>.+)', [
            'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
            'callback' => [$this, 'proxy_request'],
            'permission_callback' => [$this, 'check_permission'],
        ]);
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
        $permissions = [
            'PUT:images' => 'vinco_edit_images',
            'POST:images' => 'vinco_edit_images',
            'DELETE:images' => 'vinco_edit_images',
            'GET:validation' => 'vinco_validate_recognition',
            'POST:validation' => 'vinco_validate_recognition',
            'POST:athletes' => 'vinco_manage_athletes',
            'PUT:athletes' => 'vinco_manage_athletes',
            'GET:users' => 'vinco_manage_users',
            'POST:users' => 'vinco_manage_users',
            'GET:photographers' => 'vinco_manage_users',
            'POST:photographers' => 'vinco_manage_users',
        ];
        
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
    
    public function proxy_request($request) {
        $path = $request->get_param('path');
        $method = $request->get_method();
        $body = $request->get_json_params();
        $query = $request->get_query_params();
        unset($query['path']);
        
        // Build URL
        $url = trailingslashit($this->aws_endpoint) . $path;
        if (!empty($query)) {
            $url .= '?' . http_build_query($query);
        }
        
        // Generate JWT for AWS
        $jwt = $this->generate_jwt();
        
        // Make request
        $response = wp_remote_request($url, [
            'method' => $method,
            'headers' => [
                'Authorization' => 'Bearer ' . $jwt,
                'Content-Type' => 'application/json',
            ],
            'body' => $method !== 'GET' ? json_encode($body) : null,
            'timeout' => 30,
        ]);
        
        if (is_wp_error($response)) {
            return new WP_Error('proxy_error', $response->get_error_message(), ['status' => 500]);
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        return new WP_REST_Response($body, $status_code);
    }
    
    private function generate_jwt() {
        $user = wp_get_current_user();
        $settings = get_option('vinco_mam_settings');
        
        $payload = [
            'sub' => $user->ID,
            'email' => $user->user_email,
            'name' => $user->display_name,
            'role' => $this->get_vinco_role($user),
            'iat' => time(),
            'exp' => time() + 3600,
        ];
        
        // Sign with shared secret (in production, use proper key management)
        $secret = $settings['jwt_secret'] ?? '';
        
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
        if (in_array('administrator', $user->roles)) return 'ADMIN';
        if (in_array('vinco_editor', $user->roles) || in_array('editor', $user->roles)) return 'EDITOR';
        if (in_array('vinco_content', $user->roles)) return 'CONTENT_TEAM';
        if (in_array('vinco_photographer', $user->roles)) return 'PHOTOGRAPHER';
        return 'VIEWER';
    }
}
