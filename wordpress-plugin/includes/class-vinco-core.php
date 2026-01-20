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
        $this->define_admin_hooks();
        $this->define_api_hooks();
        $this->define_database_hooks();
    }
    
    private function load_dependencies() {
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-settings.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-api.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-auth.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-database.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-webhooks.php';
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
    
    private function define_database_hooks() {
        // Database tables are created on activation
    }
    
    public static function activate() {
        // Create custom roles
        Vinco_MAM_Roles::create_roles();
        
        // Create database tables
        Vinco_MAM_Database::create_tables();
        
        // Create options
        add_option('vinco_mam_settings', [
            'aws_region' => 'eu-west-2',
            'api_endpoint' => '',
            'websocket_endpoint' => '',
            'auto_approve_threshold' => 85,
            'review_threshold' => 50,
            'edit_version_retention_days' => 90,
        ]);
        
        flush_rewrite_rules();
    }
    
    public static function deactivate() {
        flush_rewrite_rules();
    }
}
