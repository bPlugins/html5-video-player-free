<?php
/*
 * Plugin Name: HTML5 Video Player – embed fast, responsive videos with ease
 * Description: You can easily integrate html5 Video player in your WordPress website using this plugin.
 * Plugin URI:  https://bplugins.com/html5-video-player/
 * Version:     2.13.1
 * Author:      bPlugins
 * Author URI:  http://bplugins.com
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Text Domain: html5-video-player
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

if (function_exists('h5vp_fs')) {
    h5vp_fs()->set_basename(false, __FILE__);
} else {

    if (file_exists(dirname(__FILE__) . '/vendor/autoload.php')) {
        require_once(dirname(__FILE__) . '/vendor/autoload.php');
    }
    if (file_exists(dirname(__FILE__) . '/inc/admin.php')) {
        require_once(dirname(__FILE__) . '/inc/admin.php');
    }

    /*Some Set-up*/
    define('H5VP_PLUGIN_DIR', plugin_dir_url(__FILE__));
    define('H5VP_PLUGIN_PATH', plugin_dir_path(__FILE__));
    define('H5VP_PLUGIN_FILE_BASENAME', plugin_basename(__FILE__));
    define('H5VP_PLUGIN_DIR_BASENAME', plugin_basename(__DIR__));
    define('H5VP_VER', defined('WP_DEBUG') && WP_DEBUG === true ? time() : '2.13.1');

    // Create a helper function for easy SDK access.
    function h5vp_fs()
    {
        global $h5vp_fs;

        if (!isset($h5vp_fs)) {
            $h5vp_fs = fs_dynamic_init(array(
                'id' => '14259',
                'slug' => 'html5-video-player',
                'type' => 'plugin',
                'public_key' => 'pk_42a72d9cdea87e78854f59cdc1293',
                'is_premium' => false,
                'menu' => array(
                    'slug' => 'edit.php?post_type=videoplayer',
                    'support' => false,
                    'affiliation' => false,
                    'contact' => false,
                    'first-path' => 'edit.php?post_type=videoplayer&page=h5vp-setup',
                ),
            ));
        }

        return $h5vp_fs;
    }

    h5vp_fs();
    do_action('h5vp_fs_loaded');

    require_once(__DIR__ . '/includes.php');

    /*-------------------------------------------------------------------------------*/
    /* Load Text Domain
    /*-------------------------------------------------------------------------------*/
    add_action('init', function () {
        $domain = 'html5-video-player';
        $rel_path = dirname(H5VP_PLUGIN_FILE_BASENAME) . '/languages';

        // Load the current text domain first.
        if (load_plugin_textdomain($domain, false, $rel_path)) {
            return;
        }

        // Fall back to legacy "h5vp" .mo files, loaded into the current domain.
        $locale = apply_filters('plugin_locale', determine_locale(), $domain);
        $legacy = 'h5vp-' . $locale . '.mo';

        load_textdomain($domain, WP_LANG_DIR . '/plugins/' . $legacy, $locale)
            || load_textdomain($domain, H5VP_PLUGIN_PATH . 'languages/' . $legacy, $locale);
    });

    add_action('plugins_loaded', function () {
        if (class_exists('H5VP\\Init')) {
            H5VP\Init::register_services();
            H5VP\Init::register_post_type();
        }
    });

    // Install the custom DB table at activation, and run schema upgrades on
    // admin_init after a plugin update — instead of checking the schema
    // version on every front-end request.
    register_activation_hook(__FILE__, ['H5VP\\Database\\Init', 'install']);
    add_action('admin_init', ['H5VP\\Database\\Init', 'maybe_upgrade']);


    /*-------------------------------------------------------------------------------*/
    /* TinyMce
    /*-------------------------------------------------------------------------------*/
    require_once 'tinymce/h5vp-tinymce.php';

    $bpem_bootstrap = H5VP_PLUGIN_PATH . 'vendor/bp-extension-manager/bootstrap.php';
    if (file_exists($bpem_bootstrap)) {
        require_once $bpem_bootstrap;
    }


    add_action('bpem_loaded', function () {
        if (class_exists('\\BPEM\\Manager')) {
            \BPEM\Manager::boot(array(
                'slug' => 'html5-video-player',           // unique; namespaces everything
                'name' => 'HTML5 Video Player',
                'version' => (string) H5VP_VER,
                'menu_parent' => 'edit.php?post_type=videoplayer',
                'freemius' => function_exists('h5vp_fs') ? h5vp_fs() : null,
                'max_plan_id' => 'max',
                'catalog_file' => __DIR__ . '/public/extensions.php',
                'menu_badge' => true,
                'menu_badge_persist' => true,
                'enable_freemius_checkout' => true,
                'enable_extensions' => false

            ));
        }
    });


}
