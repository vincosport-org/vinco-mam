<?php
// admin/class-vinco-admin.php

class Vinco_MAM_Admin {
    
    public function add_admin_menu() {
        // Main menu
        add_menu_page(
            'Vinco MAM',
            'Vinco MAM',
            'read',
            'vinco-mam',
            [$this, 'render_main_page'],
            'dashicons-format-gallery',
            30
        );
        
        // Submenus
        add_submenu_page('vinco-mam', 'Gallery', 'Gallery', 'read', 'vinco-mam', [$this, 'render_main_page']);
        add_submenu_page('vinco-mam', 'Validation', 'Validation', 'edit_posts', 'vinco-mam-validation', [$this, 'render_main_page']);
        add_submenu_page('vinco-mam', 'Athletes', 'Athletes', 'edit_posts', 'vinco-mam-athletes', [$this, 'render_main_page']);
        add_submenu_page('vinco-mam', 'Albums', 'Albums', 'read', 'vinco-mam-albums', [$this, 'render_main_page']);
        add_submenu_page('vinco-mam', 'Videos', 'Videos', 'read', 'vinco-mam-videos', [$this, 'render_main_page']);
        add_submenu_page('vinco-mam', 'Settings', 'Settings', 'manage_options', 'vinco-mam-settings', [$this, 'render_main_page']);
    }
    
    public function enqueue_scripts($hook) {
        if (strpos($hook, 'vinco-mam') === false) return;
        
        $asset_file = VINCO_MAM_PLUGIN_DIR . 'assets/build/index.asset.php';
        $assets = file_exists($asset_file) ? require($asset_file) : ['dependencies' => [], 'version' => VINCO_MAM_VERSION];
        
        wp_enqueue_script(
            'vinco-mam-admin',
            VINCO_MAM_PLUGIN_URL . 'assets/build/index.js',
            $assets['dependencies'],
            $assets['version'],
            true
        );
        
        wp_enqueue_style(
            'vinco-mam-admin',
            VINCO_MAM_PLUGIN_URL . 'assets/build/index.css',
            [],
            $assets['version']
        );
        
        // Pass data to React app
        wp_localize_script('vinco-mam-admin', 'vincoMAM', [
            'apiRoot' => esc_url_raw(rest_url('vinco-mam/v1/')),
            'nonce' => wp_create_nonce('wp_rest'),
            'settings' => get_option('vinco_mam_settings'),
            'user' => [
                'id' => get_current_user_id(),
                'displayName' => wp_get_current_user()->display_name,
                'email' => wp_get_current_user()->user_email,
                'role' => $this->get_vinco_role(),
                'capabilities' => $this->get_user_capabilities(),
            ],
            'currentPage' => $this->get_current_page(),
        ]);
    }
    
    public function render_main_page() {
        echo '<div id="vinco-mam-root"></div>';
    }
    
    private function get_vinco_role() {
        $user = wp_get_current_user();
        
        if (in_array('administrator', $user->roles)) return 'ADMIN';
        if (in_array('vinco_editor', $user->roles) || in_array('editor', $user->roles)) return 'EDITOR';
        if (in_array('vinco_content', $user->roles)) return 'CONTENT_TEAM';
        if (in_array('vinco_photographer', $user->roles)) return 'PHOTOGRAPHER';
        
        return 'VIEWER';
    }
    
    private function get_user_capabilities() {
        $role = $this->get_vinco_role();
        
        $capabilities = [
            'ADMIN' => [
                'viewGallery', 'editImages', 'downloadOriginal', 'downloadExport',
                'manageAlbums', 'validateRecognition', 'manageAthletes',
                'viewVideos', 'manageUsers', 'manageSettings'
            ],
            'EDITOR' => [
                'viewGallery', 'editImages', 'downloadOriginal', 'downloadExport',
                'manageAlbums', 'validateRecognition', 'manageAthletes', 'viewVideos'
            ],
            'CONTENT_TEAM' => [
                'viewGallery', 'downloadExport', 'viewAlbums', 'viewAthletes', 'viewVideos'
            ],
            'PHOTOGRAPHER' => [
                'viewOwnUploads', 'viewFtpCredentials', 'viewAlbums'
            ],
        ];
        
        return $capabilities[$role] ?? [];
    }
    
    private function get_current_page() {
        $screen = get_current_screen();
        $page = str_replace('toplevel_page_', '', $screen->id);
        $page = str_replace('vinco-mam_page_', '', $page);
        return $page;
    }
}
