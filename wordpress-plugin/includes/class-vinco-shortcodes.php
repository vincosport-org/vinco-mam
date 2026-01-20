<?php
/**
 * Shortcodes for frontend display
 */

class Vinco_MAM_Shortcodes {
    
    public function __construct() {
        add_shortcode('vinco_gallery', [$this, 'render_gallery']);
        add_shortcode('vinco_album', [$this, 'render_album']);
        add_shortcode('vinco_image', [$this, 'render_image']);
        add_shortcode('vinco_athlete_gallery', [$this, 'render_athlete_gallery']);
        
        // Enqueue frontend scripts
        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend_scripts']);
    }
    
    public function enqueue_frontend_scripts() {
        // Only load if shortcode is present
        global $post;
        if (is_a($post, 'WP_Post') && (
            has_shortcode($post->post_content, 'vinco_gallery') ||
            has_shortcode($post->post_content, 'vinco_album') ||
            has_shortcode($post->post_content, 'vinco_image') ||
            has_shortcode($post->post_content, 'vinco_athlete_gallery')
        )) {
            wp_enqueue_style('vinco-mam-frontend', VINCO_MAM_PLUGIN_URL . 'assets/frontend/style.css', [], VINCO_MAM_VERSION);
            wp_enqueue_script('vinco-mam-frontend', VINCO_MAM_PLUGIN_URL . 'assets/frontend/gallery.js', ['jquery'], VINCO_MAM_VERSION, true);
            
            wp_localize_script('vinco-mam-frontend', 'vincoMAMFrontend', [
                'apiRoot' => esc_url_raw(rest_url('vinco-mam/v1/')),
                'nonce' => wp_create_nonce('wp_rest'),
            ]);
        }
    }
    
    /**
     * Render image gallery
     * Usage: [vinco_gallery event_id="123" photographer_id="456" limit="20" columns="4"]
     */
    public function render_gallery($atts) {
        $atts = shortcode_atts([
            'event_id' => '',
            'photographer_id' => '',
            'album_id' => '',
            'limit' => 20,
            'columns' => 4,
            'lightbox' => 'true',
            'show_metadata' => 'false',
        ], $atts);
        
        $gallery_id = 'vinco-gallery-' . uniqid();
        
        ob_start();
        ?>
        <div id="<?php echo esc_attr($gallery_id); ?>" 
             class="vinco-gallery" 
             data-event-id="<?php echo esc_attr($atts['event_id']); ?>"
             data-photographer-id="<?php echo esc_attr($atts['photographer_id']); ?>"
             data-album-id="<?php echo esc_attr($atts['album_id']); ?>"
             data-limit="<?php echo esc_attr($atts['limit']); ?>"
             data-columns="<?php echo esc_attr($atts['columns']); ?>"
             data-lightbox="<?php echo esc_attr($atts['lightbox']); ?>"
             data-show-metadata="<?php echo esc_attr($atts['show_metadata']); ?>">
            <div class="vinco-gallery-loading">Loading gallery...</div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Render album
     * Usage: [vinco_album id="album-123" columns="3"]
     */
    public function render_album($atts) {
        $atts = shortcode_atts([
            'id' => '',
            'columns' => 4,
            'lightbox' => 'true',
        ], $atts);
        
        if (empty($atts['id'])) {
            return '<p>Album ID is required. Usage: [vinco_album id="album-123"]</p>';
        }
        
        $gallery_id = 'vinco-album-' . uniqid();
        
        ob_start();
        ?>
        <div id="<?php echo esc_attr($gallery_id); ?>" 
             class="vinco-album" 
             data-album-id="<?php echo esc_attr($atts['id']); ?>"
             data-columns="<?php echo esc_attr($atts['columns']); ?>"
             data-lightbox="<?php echo esc_attr($atts['lightbox']); ?>">
            <div class="vinco-gallery-loading">Loading album...</div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Render single image
     * Usage: [vinco_image id="img-123" size="large" caption="true"]
     */
    public function render_image($atts) {
        $atts = shortcode_atts([
            'id' => '',
            'size' => 'large', // thumbnail, medium, large, original
            'caption' => 'false',
            'link' => 'false',
        ], $atts);
        
        if (empty($atts['id'])) {
            return '<p>Image ID is required. Usage: [vinco_image id="img-123"]</p>';
        }
        
        $image_id = 'vinco-image-' . uniqid();
        
        ob_start();
        ?>
        <div id="<?php echo esc_attr($image_id); ?>" 
             class="vinco-single-image" 
             data-image-id="<?php echo esc_attr($atts['id']); ?>"
             data-size="<?php echo esc_attr($atts['size']); ?>"
             data-caption="<?php echo esc_attr($atts['caption']); ?>"
             data-link="<?php echo esc_attr($atts['link']); ?>">
            <div class="vinco-image-loading">Loading image...</div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Render athlete gallery
     * Usage: [vinco_athlete_gallery athlete_id="123" limit="10"]
     */
    public function render_athlete_gallery($atts) {
        $atts = shortcode_atts([
            'athlete_id' => '',
            'limit' => 10,
            'columns' => 3,
            'lightbox' => 'true',
        ], $atts);
        
        if (empty($atts['athlete_id'])) {
            return '<p>Athlete ID is required. Usage: [vinco_athlete_gallery athlete_id="123"]</p>';
        }
        
        $gallery_id = 'vinco-athlete-gallery-' . uniqid();
        
        ob_start();
        ?>
        <div id="<?php echo esc_attr($gallery_id); ?>" 
             class="vinco-athlete-gallery" 
             data-athlete-id="<?php echo esc_attr($atts['athlete_id']); ?>"
             data-limit="<?php echo esc_attr($atts['limit']); ?>"
             data-columns="<?php echo esc_attr($atts['columns']); ?>"
             data-lightbox="<?php echo esc_attr($atts['lightbox']); ?>">
            <div class="vinco-gallery-loading">Loading athlete gallery...</div>
        </div>
        <?php
        return ob_get_clean();
    }
}
