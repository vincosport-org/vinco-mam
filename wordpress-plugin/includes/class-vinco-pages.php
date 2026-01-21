<?php
/**
 * Vinco MAM Pages
 *
 * Creates and manages frontend pages for the Vinco MAM plugin.
 * Pages are automatically created on plugin activation.
 *
 * @package Vinco_MAM
 * @since 1.4.0
 */

defined('ABSPATH') || exit;

class Vinco_MAM_Pages {

    /**
     * Page definitions
     * Each page includes a slug, title, and shortcode content
     *
     * @var array
     */
    private static $pages = [
        'vinco-gallery' => [
            'title' => 'Photo Gallery',
            'content' => '[vinco_gallery columns="4" lightbox="true" show_metadata="true" public="true"]',
            'meta_description' => 'Browse our collection of sports photography.',
        ],
        'vinco-albums' => [
            'title' => 'Photo Albums',
            'content' => '[vinco_albums columns="3" public="true"]',
            'meta_description' => 'Browse photo albums organized by event and category.',
        ],
        'vinco-athletes' => [
            'title' => 'Athletes',
            'content' => '[vinco_athletes columns="4" show_stats="true" public="true"]',
            'meta_description' => 'View athlete profiles and their photo galleries.',
        ],
        'vinco-events' => [
            'title' => 'Events',
            'content' => '[vinco_events show_past="false" columns="2" public="true"]',
            'meta_description' => 'Browse photos from athletics events.',
        ],
        'vinco-search' => [
            'title' => 'Search Photos',
            'content' => '[vinco_search show_filters="true" public="true"]',
            'meta_description' => 'Search our photo archive by athlete, event, or date.',
        ],
        'vinco-tags' => [
            'title' => 'Browse by Category',
            'content' => '[vinco_tags columns="3" show_counts="true" show_children="true" public="true"]',
            'meta_description' => 'Browse photos by category, event, and location.',
        ],
        'vinco-photo' => [
            'title' => 'Photo',
            'content' => '<!-- Dynamic photo page - content loaded via JavaScript -->
<div id="vinco-photo-page" class="vinco-photo-page" data-public="true">
    <div class="vinco-gallery-loading">Loading photo...</div>
</div>',
            'meta_description' => 'View photo details.',
            'dynamic' => true,
        ],
        'vinco-athlete' => [
            'title' => 'Athlete',
            'content' => '<!-- Dynamic athlete page - content loaded via JavaScript -->
<div id="vinco-athlete-page" class="vinco-athlete-page" data-public="true">
    <div class="vinco-gallery-loading">Loading athlete profile...</div>
</div>',
            'meta_description' => 'View athlete profile and photos.',
            'dynamic' => true,
        ],
        'vinco-event' => [
            'title' => 'Event',
            'content' => '<!-- Dynamic event page - content loaded via JavaScript -->
<div id="vinco-event-page" class="vinco-event-page" data-public="true">
    <div class="vinco-gallery-loading">Loading event...</div>
</div>',
            'meta_description' => 'View event photos.',
            'dynamic' => true,
        ],
        'vinco-album' => [
            'title' => 'Album',
            'content' => '<!-- Dynamic album page - content loaded via JavaScript -->
<div id="vinco-album-page" class="vinco-album-page" data-public="true">
    <div class="vinco-gallery-loading">Loading album...</div>
</div>',
            'meta_description' => 'View album photos.',
            'dynamic' => true,
        ],
        'vinco-tag' => [
            'title' => 'Tag',
            'content' => '<!-- Dynamic tag page - content loaded via JavaScript -->
<div id="vinco-tag-page" class="vinco-tag-page" data-public="true">
    <div class="vinco-gallery-loading">Loading tag...</div>
</div>',
            'meta_description' => 'View photos by tag.',
            'dynamic' => true,
        ],
    ];

    /**
     * Create all plugin pages
     *
     * @return array Array of created page IDs
     */
    public static function create_pages() {
        $page_ids = get_option('vinco_mam_page_ids', []);
        $created = false;

        foreach (self::$pages as $slug => $page_data) {
            // Check if page already exists
            $existing_page = get_page_by_path($slug);

            if ($existing_page) {
                $page_ids[$slug] = $existing_page->ID;
                continue;
            }

            // Check if we already have a stored ID that's still valid
            if (isset($page_ids[$slug]) && get_post($page_ids[$slug])) {
                continue;
            }

            // Create the page
            $page_id = wp_insert_post([
                'post_title'     => $page_data['title'],
                'post_name'      => $slug,
                'post_content'   => $page_data['content'],
                'post_status'    => 'publish',
                'post_type'      => 'page',
                'post_author'    => get_current_user_id() ?: 1,
                'comment_status' => 'closed',
                'ping_status'    => 'closed',
            ]);

            if (!is_wp_error($page_id)) {
                $page_ids[$slug] = $page_id;
                $created = true;

                // Add meta description if available
                if (!empty($page_data['meta_description'])) {
                    update_post_meta($page_id, '_vinco_meta_description', $page_data['meta_description']);

                    // Also set Yoast SEO meta if available
                    if (defined('WPSEO_VERSION')) {
                        update_post_meta($page_id, '_yoast_wpseo_metadesc', $page_data['meta_description']);
                    }
                }

                // Mark as Vinco page for identification
                update_post_meta($page_id, '_vinco_mam_page', true);
                update_post_meta($page_id, '_vinco_page_type', $slug);
            }
        }

        // Save page IDs
        update_option('vinco_mam_page_ids', $page_ids);

        // Flush rewrite rules if pages were created
        if ($created) {
            flush_rewrite_rules();
        }

        return $page_ids;
    }

    /**
     * Delete all plugin pages
     */
    public static function delete_pages() {
        $page_ids = get_option('vinco_mam_page_ids', []);

        foreach ($page_ids as $slug => $page_id) {
            if ($page_id && get_post($page_id)) {
                // Move to trash instead of permanent delete
                wp_trash_post($page_id);
            }
        }

        delete_option('vinco_mam_page_ids');
    }

    /**
     * Get page ID by slug
     *
     * @param string $slug Page slug
     * @return int|false Page ID or false if not found
     */
    public static function get_page_id($slug) {
        $page_ids = get_option('vinco_mam_page_ids', []);
        return $page_ids[$slug] ?? false;
    }

    /**
     * Get page URL by slug
     *
     * @param string $slug Page slug
     * @return string|false Page URL or false if not found
     */
    public static function get_page_url($slug) {
        $page_id = self::get_page_id($slug);
        if ($page_id) {
            return get_permalink($page_id);
        }
        return false;
    }

    /**
     * Get all page URLs
     *
     * @return array Array of page URLs keyed by slug
     */
    public static function get_all_page_urls() {
        $page_ids = get_option('vinco_mam_page_ids', []);
        $urls = [];

        foreach ($page_ids as $slug => $page_id) {
            if ($page_id) {
                $urls[$slug] = get_permalink($page_id);
            }
        }

        return $urls;
    }

    /**
     * Check if a page exists
     *
     * @param string $slug Page slug
     * @return bool True if page exists
     */
    public static function page_exists($slug) {
        $page_id = self::get_page_id($slug);
        return $page_id && get_post($page_id);
    }

    /**
     * Recreate missing pages
     * Useful for repairs if pages were accidentally deleted
     *
     * @return array Array of recreated page IDs
     */
    public static function repair_pages() {
        $page_ids = get_option('vinco_mam_page_ids', []);
        $repaired = [];

        foreach (self::$pages as $slug => $page_data) {
            // Check if page exists AND is published (not trashed or draft)
            $page_exists = false;
            if (isset($page_ids[$slug])) {
                $post = get_post($page_ids[$slug]);
                if ($post && $post->post_status === 'publish') {
                    $page_exists = true;
                }
            }

            // Also check by slug in case page was recreated manually
            if (!$page_exists) {
                $existing_page = get_page_by_path($slug);
                if ($existing_page && $existing_page->post_status === 'publish') {
                    $page_ids[$slug] = $existing_page->ID;
                    $page_exists = true;
                }
            }

            if ($page_exists) {
                continue;
            }

            // Page is missing or trashed, recreate it
            $page_id = wp_insert_post([
                'post_title'     => $page_data['title'],
                'post_name'      => $slug,
                'post_content'   => $page_data['content'],
                'post_status'    => 'publish',
                'post_type'      => 'page',
                'post_author'    => get_current_user_id() ?: 1,
                'comment_status' => 'closed',
                'ping_status'    => 'closed',
            ]);

            if (!is_wp_error($page_id)) {
                $page_ids[$slug] = $page_id;
                $repaired[$slug] = $page_id;

                update_post_meta($page_id, '_vinco_mam_page', true);
                update_post_meta($page_id, '_vinco_page_type', $slug);
            }
        }

        // Save updated page IDs
        update_option('vinco_mam_page_ids', $page_ids);

        if (!empty($repaired)) {
            flush_rewrite_rules();
        }

        return $repaired;
    }

    /**
     * Get page definitions (for admin display)
     *
     * @return array Page definitions
     */
    public static function get_page_definitions() {
        return self::$pages;
    }
}
