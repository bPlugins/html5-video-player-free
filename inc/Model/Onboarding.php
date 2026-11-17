<?php

namespace H5VP\Model;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

/**
 * Persists the guided-setup wizard's answers.
 *
 * Deliberately a plain `wp_ajax_` handler rather than a route through
 * Model\Ajax's model/method dispatcher: the wizard ships as a shared bpl-tools
 * component, so the integration other plugins copy should be the one that
 * assumes nothing about their AJAX conventions.
 *
 * Values are written through Model\Settings into the same `h5vp_option` array
 * that CSF reads, so the Settings screen reflects the wizard immediately and
 * no migration is needed.
 */
class Onboarding
{
    /** AJAX action the wizard posts to. */
    const AJAX_ACTION = 'h5vp_save_onboarding';

    /** Option key recording that the wizard was finished or dismissed. */
    const COMPLETED_KEY = 'h5vp_onboarding_completed';

    /** Option key set at activation, consumed by the one-time redirect. */
    const REDIRECT_KEY = 'h5vp_onboarding_redirect';

    /** Capability required to change site-wide player defaults. */
    const CAPABILITY = 'manage_options';

    public function register()
    {
        add_action('wp_ajax_' . self::AJAX_ACTION, [$this, 'handle']);
    }

    /**
     * Wizard field id => [option key, sanitize callback].
     *
     * Anything not listed here is ignored, so the wizard can never write an
     * arbitrary key into the shared options array.
     */
    private function fields()
    {
        return [
            'editor' => ['h5vp_onboarding_editor', [$this, 'sanitize_editor']],
            'primary_color' => ['h5vp_player_primary_color', 'sanitize_hex_color'],
            'pause_others' => ['h5vp_pause_other_player', 'rest_sanitize_boolean'],
            'gutenberg_enable' => ['h5vp_gutenberg_enable', 'rest_sanitize_boolean'],
        ];
    }

    /**
     * AJAX entry point: verify, then persist.
     */
    public function handle()
    {
        check_ajax_referer(self::AJAX_ACTION, 'nonce');

        if (!current_user_can(self::CAPABILITY)) {
            wp_send_json_error('403 Forbidden', 403);
        }

        // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified by check_ajax_referer() above.
        wp_send_json_success($this->save(wp_unslash($_POST)));
    }

    /**
     * Save whichever wizard fields are present in the payload.
     *
     * @param array $params Unslashed request data.
     *
     * @return array Saved values plus the completion flag.
     */
    public function save($params = [])
    {
        $saved = [];

        foreach ($this->fields() as $field => $config) {
            if (!isset($params[$field])) {
                continue;
            }

            list($option_key, $sanitize) = $config;
            $value = call_user_func($sanitize, $params[$field]);

            // sanitize_hex_color() returns null for anything malformed — don't
            // overwrite a good color with an empty one.
            if (null === $value) {
                continue;
            }

            Settings::update($option_key, $value);
            $saved[$field] = $value;
        }

        if (isset($params['editor'])) {
            if ('shortcode' === $params['editor']) {
                Settings::update('h5vp_gutenberg_enable', false);
                $saved['gutenberg_enable'] = false;
            } elseif ('gutenberg' === $params['editor']) {
                Settings::update('h5vp_gutenberg_enable', true);
                $saved['gutenberg_enable'] = true;
            }
        }

        $completed = isset($params['completed']) && rest_sanitize_boolean($params['completed']);

        if ($completed) {
            $this->complete();
        }

        return [
            'saved' => $saved,
            'completed' => $completed,
        ];
    }

    /**
     * Mark the wizard as seen. Stores the version so a future release can
     * decide to re-run onboarding after a major change.
     */
    public function complete()
    {
        update_option(self::COMPLETED_KEY, (string) H5VP_VER);
        delete_option(self::REDIRECT_KEY);
    }

    /**
     * Whether the wizard has been finished or dismissed on this site.
     *
     * @return bool
     */
    public static function is_completed()
    {
        return (bool) get_option(self::COMPLETED_KEY, '');
    }

    /**
     * Restrict the editor choice to the three we actually render.
     *
     * @param mixed $value
     * @return string
     */
    public function sanitize_editor($value)
    {
        $value = sanitize_key($value);

        return in_array($value, ['gutenberg', 'elementor', 'shortcode'], true) ? $value : '';
    }
}
