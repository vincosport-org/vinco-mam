<?php
// includes/class-vinco-settings.php

class Vinco_MAM_Settings {
    
    public function __construct() {
        add_action('admin_init', [$this, 'register_settings']);
    }
    
    public function register_settings() {
        register_setting('vinco_mam_settings', 'vinco_mam_settings', [$this, 'sanitize_settings']);
    }
    
    public function sanitize_settings($input) {
        $sanitized = [];
        
        $sanitized['aws_region'] = sanitize_text_field($input['aws_region'] ?? '');
        $sanitized['api_endpoint'] = esc_url_raw($input['api_endpoint'] ?? '');
        $sanitized['websocket_endpoint'] = esc_url_raw($input['websocket_endpoint'] ?? '');
        $sanitized['auto_approve_threshold'] = absint($input['auto_approve_threshold'] ?? 85);
        $sanitized['review_threshold'] = absint($input['review_threshold'] ?? 50);
        $sanitized['edit_version_retention_days'] = absint($input['edit_version_retention_days'] ?? 90);
        $sanitized['jwt_secret'] = sanitize_text_field($input['jwt_secret'] ?? '');
        
        // FileMage settings
        $sanitized['filemage_api_token'] = sanitize_text_field($input['filemage_api_token'] ?? '');
        $sanitized['filemage_api_url'] = esc_url_raw($input['filemage_api_url'] ?? '');
        $sanitized['filemage_watch_folders'] = sanitize_textarea_field($input['filemage_watch_folders'] ?? '');
        
        return $sanitized;
    }
}
