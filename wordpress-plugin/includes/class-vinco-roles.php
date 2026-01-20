<?php
// includes/class-vinco-roles.php

class Vinco_MAM_Roles {
    
    public static function create_roles() {
        // Photographer role
        add_role('vinco_photographer', 'Vinco Photographer', [
            'read' => true,
            'vinco_view_own_uploads' => true,
            'vinco_view_ftp_credentials' => true,
        ]);
        
        // Editor role (uses WordPress editor + custom caps)
        $editor = get_role('editor');
        if ($editor) {
            $editor->add_cap('vinco_edit_images');
            $editor->add_cap('vinco_validate_recognition');
            $editor->add_cap('vinco_manage_albums');
            $editor->add_cap('vinco_manage_athletes');
        }
        
        // Content Team role
        add_role('vinco_content', 'Vinco Content Team', [
            'read' => true,
            'vinco_view_gallery' => true,
            'vinco_download_exports' => true,
            'vinco_view_albums' => true,
            'vinco_view_athletes' => true,
            'vinco_view_videos' => true,
        ]);
        
        // Admin gets all capabilities
        $admin = get_role('administrator');
        if ($admin) {
            $admin->add_cap('vinco_manage_settings');
            $admin->add_cap('vinco_manage_users');
            $admin->add_cap('vinco_edit_images');
            $admin->add_cap('vinco_validate_recognition');
            $admin->add_cap('vinco_manage_albums');
            $admin->add_cap('vinco_manage_athletes');
            $admin->add_cap('vinco_download_original');
        }
    }
    
    public static function remove_roles() {
        remove_role('vinco_photographer');
        remove_role('vinco_content');
    }
}
