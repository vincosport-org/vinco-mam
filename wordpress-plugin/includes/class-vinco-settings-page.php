<?php
/**
 * Settings page handler
 */

class Vinco_MAM_Settings_Page {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_settings_page'], 20);
    }
    
    public function add_settings_page() {
        // Settings page is handled by React app
        // This is just for WordPress menu registration
    }
    
    public function render_settings_page() {
        // Settings are rendered by React app via admin page
    }
}
