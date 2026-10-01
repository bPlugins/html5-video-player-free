<?php

namespace H5VP\Model;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

use H5VP\Helper\Functions as Utils;

class Video
{

    /**
     * Insert a video into the custom DB if it does not already exist.
     * Designed for use in save_post hooks where verifyUser / wp_send_json are inappropriate.
     *
     * @param array $args  Must contain at least 'src'. Optional: 'title', 'type'.
     * @return int|null     The video row ID, or null on failure.
     */
    public function createIfNotExists($args)
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'h5vp_videos';

        $args = wp_parse_args($args, [
            'title' => '',
            'src' => '',
            'type' => 'library',
            'post_id' => null,
            'user_id' => get_current_user_id(),
            'created_at' => wp_date("Y-m-d H:i:s", current_time("U")),
        ]);

        $raw_src = trim((string) $args['src']);
        $external_id = null;
        if ($args['type'] === 'youtube') {
            $clean_id = preg_replace('#^https?://#i', '', $raw_src);
            if (preg_match('/^[a-zA-Z0-9_-]{11}$/', $clean_id)) {
                $external_id = $clean_id;
                $args['src'] = 'https://www.youtube.com/watch?v=' . $external_id;
            } elseif (preg_match('/(?:watch\?(?:[^#\s]*&)?v=|embed\/|v\/|shorts\/|live\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/i', $raw_src, $match)) {
                $external_id = $match[1];
                $args['src'] = 'https://www.youtube.com/watch?v=' . $external_id;
            }
        } elseif ($args['type'] === 'vimeo') {
            $clean_id = preg_replace('#^https?://#i', '', $raw_src);
            if (preg_match('/^\d+$/', $clean_id)) {
                $external_id = $clean_id;
                $args['src'] = 'https://vimeo.com/' . $external_id;
            } elseif (preg_match('/(?:vimeo\.com\/(?:.*\/)?|player\.vimeo\.com\/video\/)(\d+)/i', $raw_src, $match)) {
                $external_id = $match[1];
                $args['src'] = 'https://vimeo.com/' . $external_id;
            }
        }

        $src = esc_url($args['src']);
        if (empty($src)) {
            return null;
        }
        $args['src'] = $src;

        if ($external_id) {
            $args['external_id'] = $external_id;
        }

        // Check uniqueness: for external videos try external_id + post_id first,
        // then fall back to external_id only. For library videos, check by src.
        $existing = null;
        if ($external_id && $args['post_id']) {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table; read-before-write check, caching would risk duplicate rows.
            $existing = $wpdb->get_row($wpdb->prepare(
                "SELECT id FROM %i WHERE external_id=%s AND post_id=%d",
                $table_name,
                $external_id,
                $args['post_id']
            ));
            // Fall back to external_id-only (might exist without post_id)
            if (!$existing) {
                // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table; read-before-write check, caching would risk duplicate rows.
                $existing = $wpdb->get_row($wpdb->prepare(
                    "SELECT id FROM %i WHERE external_id=%s AND (post_id IS NULL OR post_id=%d)",
                    $table_name,
                    $external_id,
                    $args['post_id']
                ));
            }
        } elseif ($external_id) {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table; read-before-write check, caching would risk duplicate rows.
            $existing = $wpdb->get_row($wpdb->prepare(
                "SELECT id FROM %i WHERE external_id=%s",
                $table_name,
                $external_id
            ));
        } else {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table; read-before-write check, caching would risk duplicate rows.
            $existing = $wpdb->get_row($wpdb->prepare(
                "SELECT id FROM %i WHERE src=%s",
                $table_name,
                $args['src']
            ));
        }

        if ($existing) {
            // Update post_id if provided
            if ($args['post_id']) {
                // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table; no WP API.
                $wpdb->update($table_name, ['post_id' => $args['post_id']], ['id' => $existing->id]);
                $this->flushLookupCache();
            }
            return (int) $existing->id;
        }

        // Fetch title from YouTube/Vimeo API if title is empty or just the post title
        if (empty($args['title']) || $args['title'] === get_the_title($args['post_id'] ?? 0)) {
            if ($args['type'] === 'youtube' && $external_id) {
                $args['title'] = $this->fetchYouTubeTitle($external_id, $args['title']);
            } elseif ($args['type'] === 'vimeo' && $external_id) {
                $args['title'] = $this->fetchVimeoTitle($external_id, $args['title']);
            }
        }

        // Build an explicit, whitelisted column map so request data can never
        // introduce arbitrary column names into the INSERT statement.
        $columns = [
            'title' => sanitize_text_field($args['title']),
            'src' => $args['src'],
            'type' => sanitize_key($args['type']),
            'user_id' => absint($args['user_id']),
            'created_at' => $args['created_at'],
        ];
        $formats = ['%s', '%s', '%s', '%d', '%s'];

        if (!empty($args['post_id'])) {
            $columns['post_id'] = absint($args['post_id']);
            $formats[] = '%d';
        }
        if (!empty($args['external_id'])) {
            $columns['external_id'] = sanitize_text_field($args['external_id']);
            $formats[] = '%s';
        }

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom plugin table; no WP API.
        $wpdb->insert($table_name, $columns, $formats);
        $this->flushLookupCache();
        return $wpdb->insert_id ?: null;
    }

    /**
     * Fetch a YouTube video title via the public oEmbed endpoint.
     * Uses oEmbed so no API key needs to be shipped with the plugin.
     */
    private function fetchYouTubeTitle($video_id, $fallback = '')
    {
        // Serve the title from a transient so we make at most one outbound
        // HTTP request per video id per day, instead of one on every save.
        $cache_key = 'h5vp_yt_' . md5($video_id);
        $cached = get_transient($cache_key);
        if (false !== $cached) {
            return $cached;
        }

        $url = add_query_arg(
            [
                'url' => 'https://www.youtube.com/watch?v=' . rawurlencode($video_id),
                'format' => 'json',
            ],
            'https://www.youtube.com/oembed'
        );
        $response = wp_remote_get($url, ['timeout' => 5]);
        if (is_wp_error($response)) {
            return $fallback;
        }
        $body = wp_remote_retrieve_body($response);
        if (empty($body)) {
            return $fallback;
        }
        $info = json_decode($body, true);
        $title = isset($info['title']) ? sanitize_text_field($info['title']) : $fallback;
        set_transient($cache_key, $title, DAY_IN_SECONDS);
        return $title;
    }

    /**
     * Fetch a Vimeo video title using wp_remote_get.
     */
    private function fetchVimeoTitle($video_id, $fallback = '')
    {
        // Serve the title from a transient so we make at most one outbound
        // HTTP request per video id per day, instead of one on every save.
        $cache_key = 'h5vp_vimeo_' . md5($video_id);
        $cached = get_transient($cache_key);
        if (false !== $cached) {
            return $cached;
        }

        $url = 'https://vimeo.com/api/v2/video/' . rawurlencode($video_id) . '.json';
        $response = wp_remote_get($url, ['timeout' => 5]);
        if (is_wp_error($response)) {
            return $fallback;
        }
        $body = wp_remote_retrieve_body($response);
        if (empty($body)) {
            return $fallback;
        }
        $info = json_decode($body, true);
        $title = isset($info[0]['title']) ? sanitize_text_field($info[0]['title']) : $fallback;
        set_transient($cache_key, $title, DAY_IN_SECONDS);
        return $title;
    }

    public function create($args)
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'h5vp_videos';
        $args = wp_parse_args($args, [
            'title' => '',
            'src' => '',
            'type' => 'library',
            'post_id' => null,
        ]);

        // Sanitize every field up front. Request data must never flow into the
        $type = sanitize_key($args['type']);
        $raw_src = trim((string) $args['src']);

        if ($type === 'youtube') {
            $clean_id = preg_replace('#^https?://#i', '', $raw_src);
            if (preg_match('/^[a-zA-Z0-9_-]{11}$/', $clean_id)) {
                $raw_src = 'https://www.youtube.com/watch?v=' . $clean_id;
            }
        } elseif ($type === 'vimeo') {
            $clean_id = preg_replace('#^https?://#i', '', $raw_src);
            if (preg_match('/^\d+$/', $clean_id)) {
                $raw_src = 'https://vimeo.com/' . $clean_id;
            }
        }

        $src = esc_url_raw($raw_src);
        $title = sanitize_text_field($args['title']);
        $post_id = $args['post_id'] !== null ? absint($args['post_id']) : null;
        $user_id = get_current_user_id();
        $created_at = wp_date("Y-m-d H:i:s", current_time("U"));

        // Per-resource authorization. A supplied post_id must reference a
        // videoplayer post the current user can edit. Without this an
        // edit_posts user could attach video rows to arbitrary posts via the
        // AJAX Video::create endpoint.
        if ($post_id) {
            if (get_post_type($post_id) !== 'videoplayer' || !current_user_can('edit_post', $post_id)) {
                return null;
            }
        }

        // Check if a video already exists in the DB.
        $video = null;
        if ($post_id) {
            $post_date = get_the_date('Y-m-d', $post_id);
            if ($post_date && $post_date >= '2026-04-25') {
                // New videoplayer posts: check uniqueness by post_id only.
                // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table; read-before-write check, caching would risk duplicate rows.
                $video = $wpdb->get_row($wpdb->prepare("SELECT * FROM %i WHERE post_id=%d", $table_name, $post_id));
            } else {
                // Old videoplayer posts: check uniqueness by post_id and src.
                // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table; read-before-write check, caching would risk duplicate rows.
                $video = $wpdb->get_row($wpdb->prepare("SELECT * FROM %i WHERE post_id=%d AND src=%s", $table_name, $post_id, $src));
            }
        } else {
            // Other post types: check uniqueness by src.
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table; read-before-write check, caching would risk duplicate rows.
            $video = $wpdb->get_row($wpdb->prepare("SELECT * FROM %i WHERE src=%s", $table_name, $src));
        }

        if ($video) {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table; no WP API.
            $wpdb->update(
                $table_name,
                ['src' => $src, 'title' => $title, 'type' => $type],
                ['id' => $video->id],
                ['%s', '%s', '%s'],
                ['%d']
            );
            $this->flushLookupCache();
            return $video->id;
        }

        // Resolve the external id + title for YouTube / Vimeo sources.
        $external_id = null;
        if ($type == 'youtube') {
            if (preg_match('/(?:watch\?(?:[^#\s]*&)?v=|embed\/|v\/|shorts\/|live\/|youtu\.be\/|^)([a-zA-Z0-9_-]{11})/i', $src, $match)) {
                $external_id = $match[1];
                $title = $this->fetchYouTubeTitle($external_id, $title);
            }
        } elseif ($type == 'vimeo') {
            if (preg_match('/(?:vimeo\.com\/(?:.*\/)?|player\.vimeo\.com\/video\/|^)(\d+)/i', $src, $match)) {
                $external_id = $match[1];
                $title = $this->fetchVimeoTitle($external_id, $title);
            }
        }

        // Build an explicit, whitelisted column map so request data can never
        // introduce arbitrary column names into the INSERT statement.
        $columns = [
            'title' => $title,
            'src' => $src,
            'type' => $type,
            'user_id' => $user_id,
            'created_at' => $created_at,
        ];
        $formats = ['%s', '%s', '%s', '%d', '%s'];

        if ($post_id) {
            $columns['post_id'] = $post_id;
            $formats[] = '%d';
        }
        if ($external_id) {
            $columns['external_id'] = $external_id;
            $formats[] = '%s';
        }

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom plugin table; no WP API.
        $wpdb->insert($table_name, $columns, $formats);
        $this->flushLookupCache();
        return $wpdb->insert_id;
    }

    public function get_id($args)
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'h5vp_videos';
        $src = esc_url($args['src']);

        // Serve the src -> id lookup from the object cache. The key embeds the
        // group's "last changed" marker, so any insert/update transparently
        // invalidates every cached lookup (see flushLookupCache()).
        $last_changed = wp_cache_get_last_changed('h5vp_videos');
        $cache_key = 'h5vp_video_id:' . md5($src) . ':' . $last_changed;
        $cached = wp_cache_get($cache_key, 'h5vp_videos');
        if (false !== $cached) {
            return $cached ?: null;
        }

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom plugin table; no WP API.
        $video = $wpdb->get_row($wpdb->prepare("SELECT id FROM %i WHERE src=%s", $table_name, $src));
        $id = $video ? (int) $video->id : 0;
        wp_cache_set($cache_key, $id, 'h5vp_videos');

        return $id ?: null;
    }

    /**
     * Bump the object-cache "last changed" marker for the videos table so any
     * previously cached lookup (e.g. get_id()) is treated as stale. Called
     * after every insert/update so cached reads can never return stale rows.
     */
    private function flushLookupCache()
    {
        wp_cache_set('last_changed', microtime(), 'h5vp_videos');
    }
}
