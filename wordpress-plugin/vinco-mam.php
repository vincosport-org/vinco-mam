<?php
/**
 * Plugin Name: Vinco Media Asset Management
 * Description: Sports media asset management with AI-powered athlete recognition
 * Version: 1.1.0
 * Requires PHP: 8.0
 * Author: Vinco Sport
 */

defined('ABSPATH') || exit;

define('VINCO_MAM_VERSION', '1.1.1');
define('VINCO_MAM_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VINCO_MAM_PLUGIN_URL', plugin_dir_url(__FILE__));

// Autoloader
spl_autoload_register(function ($class) {
    $prefix = 'Vinco_MAM_';
    if (strpos($class, $prefix) !== 0) return;
    
    $relative_class = substr($class, strlen($prefix));
    $file = VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-' . 
            strtolower(str_replace('_', '-', $relative_class)) . '.php';
    
    if (file_exists($file)) require $file;
});

// Initialize plugin
add_action('plugins_loaded', function() {
    Vinco_MAM_Core::instance();
});

// Activation hook
register_activation_hook(__FILE__, ['Vinco_MAM_Core', 'activate']);

// Deactivation hook
register_deactivation_hook(__FILE__, ['Vinco_MAM_Core', 'deactivate']);
