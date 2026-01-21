<?php
// includes/class-vinco-core.php

class Vinco_MAM_Core {
    private static $instance = null;

    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->load_dependencies();
        $this->maybe_update_capabilities();
        $this->define_admin_hooks();
        $this->define_api_hooks();
        $this->define_shortcode_hooks();
        $this->define_database_hooks();
    }

    /**
     * Update capabilities if plugin version has changed
     */
    private function maybe_update_capabilities() {
        $stored_version = get_option('vinco_mam_version', '0');
        $current_version = defined('VINCO_MAM_VERSION') ? VINCO_MAM_VERSION : Vinco_MAM_Config::PLUGIN_VERSION;

        if (version_compare($stored_version, $current_version, '<')) {
            // Re-create roles and capabilities
            Vinco_MAM_Roles::create_roles();
            update_option('vinco_mam_version', $current_version);
        }
    }

    private function load_dependencies() {
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-config.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-settings.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-api.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-auth.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-database.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-webhooks.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-shortcodes.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-pages.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'admin/class-vinco-admin.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-roles.php';
    }

    private function define_admin_hooks() {
        $admin = new Vinco_MAM_Admin();

        add_action('admin_menu', [$admin, 'add_admin_menu']);
        add_action('admin_enqueue_scripts', [$admin, 'enqueue_scripts']);
    }

    private function define_api_hooks() {
        $api = new Vinco_MAM_API();
        $webhooks = new Vinco_MAM_Webhooks();

        add_action('rest_api_init', [$api, 'register_routes']);
    }

    private function define_shortcode_hooks() {
        $shortcodes = new Vinco_MAM_Shortcodes();

        // Enqueue scripts on dynamic Vinco pages
        add_action('wp_enqueue_scripts', [$this, 'maybe_enqueue_frontend_scripts']);
    }

    /**
     * Enqueue frontend scripts on Vinco dynamic pages
     */
    public function maybe_enqueue_frontend_scripts() {
        // Check if this is a Vinco dynamic page
        if (!is_page()) return;

        $page_id = get_the_ID();
        $is_vinco_page = get_post_meta($page_id, '_vinco_mam_page', true);
        $is_dynamic = in_array(get_post_meta($page_id, '_vinco_page_type', true), [
            'vinco-photo', 'vinco-athlete', 'vinco-event', 'vinco-album', 'vinco-tag'
        ]);

        if ($is_vinco_page && $is_dynamic) {
            wp_enqueue_style('vinco-mam-frontend', VINCO_MAM_PLUGIN_URL . 'assets/frontend/style.css', [], VINCO_MAM_VERSION);
            wp_enqueue_script('vinco-mam-frontend', VINCO_MAM_PLUGIN_URL . 'assets/frontend/gallery.js', ['jquery'], VINCO_MAM_VERSION, true);

            $localize_data = [
                'apiRoot' => esc_url_raw(rest_url('vinco-mam/v1/')),
                'pages' => Vinco_MAM_Pages::get_all_page_urls(),
            ];

            if (is_user_logged_in()) {
                $localize_data['nonce'] = wp_create_nonce('wp_rest');
            }

            wp_localize_script('vinco-mam-frontend', 'vincoMAMFrontend', $localize_data);
        }
    }

    private function define_database_hooks() {
        // Database tables are created on activation
    }

    public static function activate() {
        // Load required dependencies for activation
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-config.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-roles.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-database.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-pages.php';

        // Create custom roles
        Vinco_MAM_Roles::create_roles();

        // Create database tables
        Vinco_MAM_Database::create_tables();

        // Create frontend pages
        Vinco_MAM_Pages::create_pages();

        // Create options with hardcoded config values
        $default_settings = [
            'auto_approve_threshold' => Vinco_MAM_Config::DEFAULT_AUTO_APPROVE_THRESHOLD,
            'review_threshold' => Vinco_MAM_Config::DEFAULT_REVIEW_THRESHOLD,
            'edit_version_retention_days' => Vinco_MAM_Config::DEFAULT_EDIT_VERSION_RETENTION_DAYS,
            'filemage_api_token' => '',
            'filemage_watch_folders' => '',
        ];

        // Only add option if it doesn't exist (preserve existing settings on reactivation)
        if (!get_option('vinco_mam_settings')) {
            add_option('vinco_mam_settings', $default_settings);
        }

        // Store the created page IDs
        update_option('vinco_mam_version', Vinco_MAM_Config::PLUGIN_VERSION);

        flush_rewrite_rules();
    }

    public static function deactivate() {
        flush_rewrite_rules();
    }

    /**
     * Uninstall - called when plugin is deleted
     * Note: This should be in uninstall.php, but kept here for reference
     */
    public static function uninstall() {
        // Remove pages
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-pages.php';
        Vinco_MAM_Pages::delete_pages();

        // Remove roles
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-roles.php';
        Vinco_MAM_Roles::remove_roles();

        // Remove options
        delete_option('vinco_mam_settings');
        delete_option('vinco_mam_version');
        delete_option('vinco_mam_page_ids');

        // Note: Database tables are NOT removed to preserve data
        // Uncomment the following to remove tables:
        // require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-database.php';
        // Vinco_MAM_Database::drop_tables();
    }
}
