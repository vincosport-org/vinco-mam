<?php
/**
 * Shortcodes for frontend display
 * These allow non-admin users to view and interact with galleries on the frontend
 */

class Vinco_MAM_Shortcodes {
    
    public function __construct() {
        add_shortcode('vinco_gallery', [$this, 'render_gallery']);
        add_shortcode('vinco_album', [$this, 'render_album']);
        add_shortcode('vinco_albums', [$this, 'render_albums']);
        add_shortcode('vinco_image', [$this, 'render_image']);
        add_shortcode('vinco_athlete_gallery', [$this, 'render_athlete_gallery']);
        add_shortcode('vinco_athletes', [$this, 'render_athletes']);
        add_shortcode('vinco_events', [$this, 'render_events']);
        add_shortcode('vinco_search', [$this, 'render_search']);
        add_shortcode('vinco_tags', [$this, 'render_tags']);
        add_shortcode('vinco_tag', [$this, 'render_tag_gallery']);

        // Enqueue frontend scripts
        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend_scripts']);
    }
    
    public function enqueue_frontend_scripts() {
        // Only load if shortcode is present
        global $post;
        $shortcodes = [
            'vinco_gallery', 'vinco_album', 'vinco_albums', 'vinco_image',
            'vinco_athlete_gallery', 'vinco_athletes', 'vinco_events', 'vinco_search',
            'vinco_tags', 'vinco_tag'
        ];

        $has_shortcode = false;
        if (is_a($post, 'WP_Post')) {
            foreach ($shortcodes as $shortcode) {
                if (has_shortcode($post->post_content, $shortcode)) {
                    $has_shortcode = true;
                    break;
                }
            }
        }

        if ($has_shortcode) {
            wp_enqueue_style('vinco-mam-frontend', VINCO_MAM_PLUGIN_URL . 'assets/frontend/style.css', [], VINCO_MAM_VERSION);
            wp_enqueue_script('vinco-mam-frontend', VINCO_MAM_PLUGIN_URL . 'assets/frontend/gallery.js', ['jquery'], VINCO_MAM_VERSION, true);

            // Only include nonce for logged-in users (allows public viewing for GET requests)
            $localize_data = [
                'apiRoot' => esc_url_raw(rest_url('vinco-mam/v1/')),
                'pages' => Vinco_MAM_Pages::get_all_page_urls(),
            ];

            // Add nonce only if user is logged in
            if (is_user_logged_in()) {
                $localize_data['nonce'] = wp_create_nonce('wp_rest');
            }

            wp_localize_script('vinco-mam-frontend', 'vincoMAMFrontend', $localize_data);
        }
    }
    
    /**
     * Render image gallery with filters
     * Usage: [vinco_gallery event_id="123" photographer_id="456" limit="50" columns="4" show_filters="true"]
     * This shortcode works for both logged-in and public users (if gallery is public)
     */
    public function render_gallery($atts) {
        $atts = shortcode_atts([
            'event_id' => '',
            'photographer_id' => '',
            'album_id' => '',
            'tag_id' => '',
            'limit' => 50,
            'columns' => 4,
            'lightbox' => 'true',
            'show_metadata' => 'true',
            'show_filters' => 'true',
            'public' => 'false', // If true, allows public viewing
        ], $atts);

        $gallery_id = 'vinco-gallery-' . uniqid();

        ob_start();
        ?>
        <div id="<?php echo esc_attr($gallery_id); ?>"
             class="vinco-gallery"
             data-event-id="<?php echo esc_attr($atts['event_id']); ?>"
             data-photographer-id="<?php echo esc_attr($atts['photographer_id']); ?>"
             data-album-id="<?php echo esc_attr($atts['album_id']); ?>"
             data-tag-id="<?php echo esc_attr($atts['tag_id']); ?>"
             data-limit="<?php echo esc_attr($atts['limit']); ?>"
             data-columns="<?php echo esc_attr($atts['columns']); ?>"
             data-lightbox="<?php echo esc_attr($atts['lightbox']); ?>"
             data-show-metadata="<?php echo esc_attr($atts['show_metadata']); ?>"
             data-show-filters="<?php echo esc_attr($atts['show_filters']); ?>"
             data-public="<?php echo esc_attr($atts['public']); ?>">
            <?php if ($atts['show_filters'] === 'true'): ?>
            <div class="vinco-filter-bar vinco-gallery-filters">
                <div class="vinco-filter-row">
                    <input type="text" class="vinco-filter-search" placeholder="Search photos..." data-filter="search" />
                </div>
                <div class="vinco-filter-row vinco-filter-advanced">
                    <select class="vinco-filter-select" data-filter="athlete">
                        <option value="">All Athletes</option>
                    </select>
                    <select class="vinco-filter-select" data-filter="event">
                        <option value="">All Events</option>
                    </select>
                    <select class="vinco-filter-select" data-filter="tag">
                        <option value="">All Tags</option>
                    </select>
                    <input type="date" class="vinco-filter-date" data-filter="dateFrom" placeholder="From" />
                    <input type="date" class="vinco-filter-date" data-filter="dateTo" placeholder="To" />
                </div>
                <div class="vinco-filter-actions">
                    <button type="button" class="vinco-filter-btn vinco-filter-apply">Apply Filters</button>
                    <button type="button" class="vinco-filter-btn vinco-filter-clear">Clear</button>
                </div>
            </div>
            <?php endif; ?>
            <div class="vinco-gallery-grid">
                <div class="vinco-gallery-loading">Loading gallery...</div>
            </div>
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
            'public' => 'false',
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
             data-lightbox="<?php echo esc_attr($atts['lightbox']); ?>"
             data-public="<?php echo esc_attr($atts['public']); ?>">
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
            'public' => 'false',
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
             data-link="<?php echo esc_attr($atts['link']); ?>"
             data-public="<?php echo esc_attr($atts['public']); ?>">
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
            'public' => 'false',
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
             data-lightbox="<?php echo esc_attr($atts['lightbox']); ?>"
             data-public="<?php echo esc_attr($atts['public']); ?>">
            <div class="vinco-gallery-loading">Loading athlete gallery...</div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render albums list with filters
     * Usage: [vinco_albums columns="3" show_filters="true" public="true"]
     */
    public function render_albums($atts) {
        $atts = shortcode_atts([
            'columns' => 3,
            'limit' => 50,
            'show_filters' => 'true',
            'public' => 'false',
        ], $atts);

        $container_id = 'vinco-albums-' . uniqid();

        ob_start();
        ?>
        <div id="<?php echo esc_attr($container_id); ?>"
             class="vinco-albums-list"
             data-columns="<?php echo esc_attr($atts['columns']); ?>"
             data-limit="<?php echo esc_attr($atts['limit']); ?>"
             data-show-filters="<?php echo esc_attr($atts['show_filters']); ?>"
             data-public="<?php echo esc_attr($atts['public']); ?>">
            <?php if ($atts['show_filters'] === 'true'): ?>
            <div class="vinco-filter-bar">
                <div class="vinco-filter-row">
                    <input type="text" class="vinco-filter-search" placeholder="Search albums..." data-filter="search" />
                    <button type="button" class="vinco-filter-btn vinco-filter-clear">Clear</button>
                </div>
            </div>
            <?php endif; ?>
            <div class="vinco-albums-grid">
                <div class="vinco-gallery-loading">Loading albums...</div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render athletes list with filters
     * Usage: [vinco_athletes columns="4" show_stats="true" show_filters="true" public="true"]
     */
    public function render_athletes($atts) {
        $atts = shortcode_atts([
            'columns' => 4,
            'limit' => 100,
            'show_stats' => 'true',
            'show_filters' => 'true',
            'public' => 'false',
        ], $atts);

        $container_id = 'vinco-athletes-' . uniqid();

        ob_start();
        ?>
        <div id="<?php echo esc_attr($container_id); ?>"
             class="vinco-athletes-list"
             data-columns="<?php echo esc_attr($atts['columns']); ?>"
             data-limit="<?php echo esc_attr($atts['limit']); ?>"
             data-show-stats="<?php echo esc_attr($atts['show_stats']); ?>"
             data-show-filters="<?php echo esc_attr($atts['show_filters']); ?>"
             data-public="<?php echo esc_attr($atts['public']); ?>">
            <?php if ($atts['show_filters'] === 'true'): ?>
            <div class="vinco-filter-bar">
                <div class="vinco-filter-row">
                    <input type="text" class="vinco-filter-search" placeholder="Search by name..." data-filter="search" />
                    <select class="vinco-filter-select vinco-filter-nationality" data-filter="nationality">
                        <option value="">All Nationalities</option>
                    </select>
                    <select class="vinco-filter-select vinco-filter-discipline" data-filter="discipline">
                        <option value="">All Disciplines</option>
                    </select>
                    <select class="vinco-filter-select vinco-filter-team" data-filter="team">
                        <option value="">All Teams</option>
                    </select>
                </div>
                <div class="vinco-filter-row">
                    <label class="vinco-filter-label">Age Range:</label>
                    <input type="number" class="vinco-filter-number" data-filter="ageMin" placeholder="Min" min="0" max="100" />
                    <span class="vinco-filter-separator">-</span>
                    <input type="number" class="vinco-filter-number" data-filter="ageMax" placeholder="Max" min="0" max="100" />
                    <button type="button" class="vinco-filter-btn vinco-filter-clear">Clear Filters</button>
                </div>
            </div>
            <?php endif; ?>
            <div class="vinco-athletes-grid">
                <div class="vinco-gallery-loading">Loading athletes...</div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render events list
     * Usage: [vinco_events show_past="false" columns="2" public="true"]
     */
    public function render_events($atts) {
        $atts = shortcode_atts([
            'columns' => 2,
            'limit' => 20,
            'show_past' => 'true',
            'public' => 'false',
        ], $atts);

        $container_id = 'vinco-events-' . uniqid();

        ob_start();
        ?>
        <div id="<?php echo esc_attr($container_id); ?>"
             class="vinco-events-list"
             data-columns="<?php echo esc_attr($atts['columns']); ?>"
             data-limit="<?php echo esc_attr($atts['limit']); ?>"
             data-show-past="<?php echo esc_attr($atts['show_past']); ?>"
             data-public="<?php echo esc_attr($atts['public']); ?>">
            <div class="vinco-gallery-loading">Loading events...</div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render search interface
     * Usage: [vinco_search show_filters="true" public="true"]
     */
    public function render_search($atts) {
        $atts = shortcode_atts([
            'show_filters' => 'true',
            'columns' => 4,
            'public' => 'false',
        ], $atts);

        $container_id = 'vinco-search-' . uniqid();

        ob_start();
        ?>
        <div id="<?php echo esc_attr($container_id); ?>"
             class="vinco-search"
             data-show-filters="<?php echo esc_attr($atts['show_filters']); ?>"
             data-columns="<?php echo esc_attr($atts['columns']); ?>"
             data-public="<?php echo esc_attr($atts['public']); ?>">
            <div class="vinco-search-form">
                <input type="text" class="vinco-search-input" placeholder="Search photos by athlete, event, or keyword..." />
                <button type="button" class="vinco-search-button">Search</button>
            </div>
            <div class="vinco-search-results">
                <div class="vinco-gallery-loading" style="display: none;">Searching...</div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render tags hierarchy/tree
     * Usage: [vinco_tags type="EVENT" columns="3" show_counts="true" public="true"]
     */
    public function render_tags($atts) {
        $atts = shortcode_atts([
            'type' => '', // EVENT, LOCATION, CATEGORY, CUSTOM or empty for all
            'columns' => 3,
            'show_counts' => 'true',
            'show_children' => 'true',
            'max_depth' => 2,
            'public' => 'false',
        ], $atts);

        $container_id = 'vinco-tags-' . uniqid();

        ob_start();
        ?>
        <div id="<?php echo esc_attr($container_id); ?>"
             class="vinco-tags-list"
             data-type="<?php echo esc_attr($atts['type']); ?>"
             data-columns="<?php echo esc_attr($atts['columns']); ?>"
             data-show-counts="<?php echo esc_attr($atts['show_counts']); ?>"
             data-show-children="<?php echo esc_attr($atts['show_children']); ?>"
             data-max-depth="<?php echo esc_attr($atts['max_depth']); ?>"
             data-public="<?php echo esc_attr($atts['public']); ?>">
            <div class="vinco-gallery-loading">Loading tags...</div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render gallery filtered by tag
     * Usage: [vinco_tag id="tag_xxx" columns="4" lightbox="true" public="true"]
     */
    public function render_tag_gallery($atts) {
        $atts = shortcode_atts([
            'id' => '',
            'slug' => '', // Alternative to id - use slug
            'columns' => 4,
            'limit' => 50,
            'lightbox' => 'true',
            'show_header' => 'true',
            'public' => 'false',
        ], $atts);

        if (empty($atts['id']) && empty($atts['slug'])) {
            return '<p>Tag ID or slug is required. Usage: [vinco_tag id="tag_xxx"] or [vinco_tag slug="2025-weltklasse-zurich"]</p>';
        }

        $container_id = 'vinco-tag-gallery-' . uniqid();

        ob_start();
        ?>
        <div id="<?php echo esc_attr($container_id); ?>"
             class="vinco-tag-gallery"
             data-tag-id="<?php echo esc_attr($atts['id']); ?>"
             data-tag-slug="<?php echo esc_attr($atts['slug']); ?>"
             data-columns="<?php echo esc_attr($atts['columns']); ?>"
             data-limit="<?php echo esc_attr($atts['limit']); ?>"
             data-lightbox="<?php echo esc_attr($atts['lightbox']); ?>"
             data-show-header="<?php echo esc_attr($atts['show_header']); ?>"
             data-public="<?php echo esc_attr($atts['public']); ?>">
            <div class="vinco-gallery-loading">Loading tag gallery...</div>
        </div>
        <?php
        return ob_get_clean();
    }
}
