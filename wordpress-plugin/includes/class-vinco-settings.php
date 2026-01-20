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

        // Recognition thresholds (configurable)
        $sanitized['auto_approve_threshold'] = absint($input['auto_approve_threshold'] ?? Vinco_MAM_Config::DEFAULT_AUTO_APPROVE_THRESHOLD);
        $sanitized['review_threshold'] = absint($input['review_threshold'] ?? Vinco_MAM_Config::DEFAULT_REVIEW_THRESHOLD);
        $sanitized['edit_version_retention_days'] = absint($input['edit_version_retention_days'] ?? Vinco_MAM_Config::DEFAULT_EDIT_VERSION_RETENTION_DAYS);

        // FileMage settings (only API token and watch folders are configurable)
        $sanitized['filemage_api_token'] = sanitize_text_field($input['filemage_api_token'] ?? '');
        $sanitized['filemage_watch_folders'] = sanitize_textarea_field($input['filemage_watch_folders'] ?? '');

        return $sanitized;
    }

    /**
     * Get a setting value with fallback to defaults
     *
     * @param string $key Setting key
     * @return mixed Setting value
     */
    public static function get($key) {
        $settings = get_option('vinco_mam_settings', []);

        $defaults = [
            'auto_approve_threshold' => Vinco_MAM_Config::DEFAULT_AUTO_APPROVE_THRESHOLD,
            'review_threshold' => Vinco_MAM_Config::DEFAULT_REVIEW_THRESHOLD,
            'edit_version_retention_days' => Vinco_MAM_Config::DEFAULT_EDIT_VERSION_RETENTION_DAYS,
            'filemage_api_token' => '',
            'filemage_watch_folders' => '',
        ];

        return $settings[$key] ?? $defaults[$key] ?? null;
    }
}
