<?php

namespace H5VP\Block;

if (!defined('ABSPATH')) {
    return;
}

if (!class_exists(__NAMESPACE__ . '\H5VP_Block')) {
    class H5VP_Block
    {
        function __construct()
        {
            add_action('init', [$this, 'register_block']);
            add_action('enqueue_block_assets', [$this, 'enqueue_script']);
            add_action('enqueue_block_assets', [$this, 'localize_audio_block']);
            add_action('enqueue_block_assets', [$this, 'localize_playlist_block']);
        }

        function register_block()
        {
            register_block_type(H5VP_PLUGIN_PATH . 'build/blocks/parent');
            register_block_type(H5VP_PLUGIN_PATH . 'build/blocks/video');
            register_block_type(H5VP_PLUGIN_PATH . 'build/blocks/youtube');
            register_block_type(H5VP_PLUGIN_PATH . 'build/blocks/vimeo');
            register_block_type(H5VP_PLUGIN_PATH . 'build/blocks/audio');
            register_block_type(H5VP_PLUGIN_PATH . 'build/blocks/playlist');
        }

        function enqueue_script()
        {
            // Front-end scripts never block rendering: `defer` keeps them in <head> but runs them after parsing.
            $defer = ['strategy' => 'defer', 'in_footer' => false];

            wp_register_script('bplugins-plyrio', plugin_dir_url(__FILE__) . 'public/js/plyr-v3.8.4.polyfilled.js', [], '3.8.4', $defer);
            wp_register_script('bplugins-hls', plugin_dir_url(__FILE__) . 'public/js/hls.min.js', [], '1.7.0', $defer);
            // No wp-util: the front-end bundle never calls wp.ajax, and wp-util pulled jQuery, jQuery Migrate and Underscore onto every page with a player.
            wp_register_script('h5vp-view', plugin_dir_url(__FILE__) . 'build/blocks/view.js', ['react', 'react-dom', 'bplugins-plyrio'], $this->asset_version('blocks/view'), $defer);
            wp_register_script('h5vp-blocks', plugin_dir_url(__FILE__) . 'build/blocks/blocks.js', [], $this->asset_version('blocks/blocks'), false);

            wp_register_style('bplugins-plyrio', plugin_dir_url(__FILE__) . 'public/css/h5vp.css', [], H5VP_VER, 'all');
            wp_register_style('h5vp-view', plugin_dir_url(__FILE__) . 'build/blocks/view.css', ['bplugins-plyrio'], $this->asset_version('blocks/view'), 'all');
            wp_register_style('h5vp-blocks', plugin_dir_url(__FILE__) . 'build/blocks/blocks.css', [], $this->asset_version('blocks/blocks'), 'all');

            // React is only needed once the player mounts. WordPress applies `defer` only when every script that
            // depends on React can wait as well, and keeps it blocking otherwise, so other plugins are unaffected.
            if (!is_admin()) {
                wp_script_add_data('react', 'strategy', 'defer');
                wp_script_add_data('react-dom', 'strategy', 'defer');
            }

            $localize_data = $this->get_localize_data();

            wp_localize_script('h5vp-blocks', 'h5vpBlock', $localize_data);
            wp_localize_script('h5vp-view', 'h5vpBlock', $localize_data);

        }

        /**
         * Print a block's front-end view script in the footer. Its dependencies wp-hooks and wp-i18n can't be
         * deferred (core attaches an inline script to wp-i18n), so with the view script in <head> they blocked
         * the first paint; in the footer they load after the content is shown.
         */
        private function print_view_script_in_footer($block_name)
        {
            if (is_admin()) {
                return;
            }
            $handle = generate_block_asset_handle($block_name, 'viewScript');
            if (wp_script_is($handle, 'registered')) {
                wp_script_add_data($handle, 'group', 1);
            }
        }

        /** Content-hash version from a build's .asset.php, so browsers re-download only when the file changes. */
        private function asset_version($entry)
        {
            $file = H5VP_PLUGIN_PATH . 'build/' . $entry . '.asset.php';
            if (file_exists($file)) {
                $asset = require $file;
                if (!empty($asset['version'])) {
                    return $asset['version'];
                }
            }

            return H5VP_VER;
        }

        /**
         * The single `window.h5vpBlock` payload.
         *
         * Every handle that localizes `h5vpBlock` has to emit *this* array.
         * wp_localize_script() prints a plain `var h5vpBlock = {...}` per handle,
         * so the last one on the page wins — a handle that publishes a trimmed
         * subset silently deletes keys the editor bundle depends on
         * (BSettings.tsx reads h5vpBlock.adminUrl without a null guard).
         *
         * @return array
         */
        private function get_localize_data()
        {
            $get_option = h5vp_get_option();

            $localize_data = [
                'siteUrl' => site_url(),
                'userId' => get_current_user_id(),
                'pauseOther' => (bool) \H5VP\Helper\Functions::getOptionDeep("h5vp_option", "h5vp_pause_other_player", false),
                'plugin_url' => H5VP_PLUGIN_DIR,
                'brandColor' => $get_option('h5vp_player_primary_color', '#00b2ff'),
                'iconUrl' => H5VP_PLUGIN_DIR . 'img/plyr.svg',
                'hlsUrl' => plugin_dir_url(__FILE__) . 'public/js/hls.min.js',
                'postId' => is_singular() ? (int) get_the_ID() : 0,
            ];

            if (current_user_can('edit_posts')) {
                $localize_data['adminUrl'] = admin_url();
                $localize_data['editorNonce'] = wp_create_nonce('h5vp_ajax_handler');
            }

            return $localize_data;
        }

        function localize_audio_block()
        {
            $get_option = h5vp_get_option();
            $data = [
                'brandColor' => $get_option('h5vp_player_primary_color', '#00b2ff'),
                'iconUrl' => H5VP_PLUGIN_DIR . 'img/plyr.svg',
            ];

            foreach (['editorScript', 'viewScript'] as $field) {
                $handle = generate_block_asset_handle('html5-player/audio', $field);
                if (wp_script_is($handle, 'registered')) {
                    wp_localize_script($handle, 'h5vpAudioBlock', $data);
                }
            }

            $this->print_view_script_in_footer('html5-player/audio');
        }

        function localize_playlist_block()
        {
            $data = $this->get_localize_data();

            global $wp_scripts, $wp_styles;

            foreach (['editorScript', 'viewScript'] as $field) {
                $handle = generate_block_asset_handle('html5-player/playlist', $field);
                if (wp_script_is($handle, 'registered')) {
                    if (isset($wp_scripts->registered[$handle]) && is_array($wp_scripts->registered[$handle]->deps)) {
                        if (!in_array('bplugins-plyrio', $wp_scripts->registered[$handle]->deps)) {
                            $wp_scripts->registered[$handle]->deps[] = 'bplugins-plyrio';
                        }
                    }
                    wp_localize_script($handle, 'h5vpBlock', $data);
                    wp_localize_script($handle, 'h5vpPlaylistBlock', $data);
                }
            }

            $this->print_view_script_in_footer('html5-player/playlist');

            foreach (['editorStyle', 'style'] as $field) {
                $handle = generate_block_asset_handle('html5-player/playlist', $field);
                if (wp_style_is($handle, 'registered')) {
                    if (isset($wp_styles->registered[$handle]) && is_array($wp_styles->registered[$handle]->deps)) {
                        if (!in_array('bplugins-plyrio', $wp_styles->registered[$handle]->deps)) {
                            $wp_styles->registered[$handle]->deps[] = 'bplugins-plyrio';
                        }
                    }
                }
            }
        }

    }

    new H5VP_Block();
}
