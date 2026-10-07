<?php

namespace H5VP\Services;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly


class EnqueueAssets
{
    protected static $_instance = null;

    const METABOX_TAB_POST_TYPES = array('videoplayer');

    public function __construct()
    {
        add_action('admin_enqueue_scripts', [$this, 'enqueueAdminAssets']);
        add_action('admin_enqueue_scripts', [$this, 'persistMetaboxTab'], 20);
    }

    public static function instance()
    {
        if (self::$_instance === null) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }


    public function enqueueAdminAssets($hook_suffix)
    {
        // Resolve the post type from the current screen. This avoids reading
        // the raw $_GET['post_type'] query var (and the nonce-verification
        // warning that comes with it) and works for edit.php / post-new.php /
        // post.php alike.
        $screen = get_current_screen();
        $post_type = ($screen && $screen->post_type) ? $screen->post_type : get_post_type();

        $isInPages = in_array($hook_suffix, array(
            'videoplayer_page_h5vp-support',
            'videoplayer_page_html5vp_settings',
            'videoplayer_page_html5vp_quick_player',
            'videoplayer_page_free-plugins-from-bplugins',
            'videoplayer_page_premium-plugins',
            'videoplayer_page_analytics',
        ), true);
        $isInPostType = in_array($hook_suffix, array('post.php', 'post-new.php', 'edit.php'), true)
            && 'videoplayer' === $post_type;

        if (!$isInPages && !$isInPostType) {
            return;
        }

        wp_enqueue_script('h5vp-admin', H5VP_PLUGIN_DIR . 'build/admin.js', array('jquery', 'react', 'react-dom', 'wp-util'), H5VP_VER, true);
        wp_enqueue_style('h5vp-admin', H5VP_PLUGIN_DIR . 'build/admin.css', array(), H5VP_VER);

        wp_localize_script('h5vp-admin', 'h5vpAdmin', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'website' => site_url(),
            'email' => get_option('admin_email'),
            'nonce' => wp_create_nonce('h5vp_admin'),
        ));
    }

    /**
     * Keep the active Codestar metabox tab after Publish/Update reloads the page,
     * instead of falling back to the first tab. Remembered per post + metabox in
     * sessionStorage, so other players still open on the first tab.
     * Hooked after CSF (priority 10) so the 'csf' handle is registered; the inline
     * script prints right after CSF's main.js, so it runs once CSF has bound its tabs.
     */
    public function persistMetaboxTab()
    {
        $screen = get_current_screen();
        if (!$screen || 'post' !== $screen->base || !in_array($screen->post_type, self::METABOX_TAB_POST_TYPES, true)) {
            return;
        }
        if (!wp_script_is('csf', 'registered')) {
            return;
        }

        $script = <<<'JS'
jQuery(function ($) {
    var postId = $('#post_ID').val();
    if (!postId) return;
    $('.csf-metabox .csf-nav-metabox').each(function () {
        var $links = $(this).find('a');
        var key = 'h5vp_csf_tab_' + postId + '_' + ($(this).closest('.postbox').attr('id') || '');
        var saved = NaN;
        try { saved = parseInt(window.sessionStorage.getItem(key), 10); } catch (e) {}
        if (saved > 0 && saved < $links.length) {
            $links.eq(saved).trigger('click');
        }
        $links.on('click', function () {
            try { window.sessionStorage.setItem(key, String($links.index(this))); } catch (e) {}
        });
    });
});
JS;
        wp_add_inline_script('csf', $script, 'after');
    }
}
