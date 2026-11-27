<?php
/**
 * Uninstall HTML5 Video Player.
 *
 * Runs when the plugin is deleted from the WordPress admin. Removes every
 * piece of data the plugin created: settings, per-player options, the
 * "videoplayer" custom post type entries and the custom videos table.
 *
 * @package H5VP
 */

// Exit if uninstall is not called from WordPress.
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

/**
 * Remove all HTML5 Video Player data for the current site.
 *
 * @return void
 */
function h5vp_uninstall_site()
{
    global $wpdb;

    // Keep everything when the Pro version is present (shared options, "videoplayer" posts and
    if (!function_exists('is_plugin_active')) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
    }
    $pro_plugin = 'html5-video-player-pro/html5-video-player.php';
    if (is_plugin_active($pro_plugin) || file_exists(WP_PLUGIN_DIR . '/' . $pro_plugin)) {
        return;
    }

    // Only remove data when the user opted in via the plugin settings. This is
    // the single key the settings screen writes, so what the checkbox shows is
    // always what runs here.
    $settings = get_option('h5vp_option', []);
    if (empty($settings['h5vp_remove_data_on_uninstall'])) {
        return;
    }

    // 1. Delete plugin options.
    $options = [
        'h5vp_option',                  // General settings.
        'h5vp_quick',                   // Quick player settings.
        'h5vp_videos_database_version', // Custom table schema version.
        'h5vp_onboarding_completed',    // Guided-setup completion marker.
        'h5vp_onboarding_redirect',     // Guided-setup one-time redirect flag.
    ];
    foreach ($options as $option) {
        delete_option($option);
    }

    // 2. Delete the per-player "propagans_{ID}" options created for protected players.
    $like = $wpdb->esc_like('propagans_') . '%';
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
    $propagans = $wpdb->get_col(
        $wpdb->prepare("SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s", $like)
    );
    foreach ($propagans as $option) {
        delete_option($option);
    }

    // 3. Delete every "videoplayer" custom post type entry (and its post meta).
    // The post type is not registered during uninstall, so query every status explicitly.
    $player_ids = get_posts([
        'post_type' => 'videoplayer',
        'post_status' => ['publish', 'pending', 'draft', 'future', 'private', 'trash', 'auto-draft'],
        'numberposts' => -1,
        'fields' => 'ids',
    ]);
    foreach ($player_ids as $player_id) {
        wp_delete_post((int) $player_id, true);
    }

    // Delete the video categories. The taxonomy is not registered during uninstall, so register it just to delete its terms.
    register_taxonomy('h5vp_video_cat', 'videoplayer');
    $category_ids = get_terms(['taxonomy' => 'h5vp_video_cat', 'hide_empty' => false, 'fields' => 'ids']);
    if (is_array($category_ids)) {
        foreach ($category_ids as $category_id) {
            wp_delete_term((int) $category_id, 'h5vp_video_cat');
        }
    }

    // 4. Drop the custom videos table.
    $table = $wpdb->prefix . 'h5vp_videos';
    // The %i placeholder safely escapes the table identifier (WP 6.2+).
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
    $wpdb->query($wpdb->prepare("DROP TABLE IF EXISTS %i", $table));

    // 5. Let Freemius clean up its own data, when loaded.
    if (function_exists('h5vp_fs')) {
        h5vp_fs()->_uninstall_plugin_event();
    }
}

// Run the cleanup for every site on multisite installs, or just this site otherwise.
if (is_multisite()) {
    $h5vp_site_ids = get_sites(['fields' => 'ids', 'number' => 0]);
    foreach ($h5vp_site_ids as $h5vp_site_id) {
        switch_to_blog($h5vp_site_id);
        h5vp_uninstall_site();
        restore_current_blog();
    }
} else {
    h5vp_uninstall_site();
}
