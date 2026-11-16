<?php

namespace H5VP\Admin;

if ( ! defined( 'ABSPATH' ) ) { exit; }

if ( ! class_exists( __NAMESPACE__ . '\H5VP_PromoBanner' ) ) {

    class H5VP_PromoBanner {
        const DISMISSED_KEY   = 'h5vp_promo_banner_dismissed_permanent';
        const EXPIRATION_DATE = '2026-12-05 23:59:59';

        /** Target landing URLs */
        const DASHBOARD_URL    = 'https://bplugins.com/products/html5-video-player/pricing/?utm_source=admin&utm_medium=dashboard&utm_campaign=bfcm2026';
        const PLUGINS_PAGE_URL = 'https://bplugins.com/products/html5-video-player/pricing/?utm_source=admin&utm_medium=plugins&utm_campaign=bfcm2026';

        public function __construct() {
            add_action( 'admin_notices',                     [ $this, 'render' ] );
            add_action( 'admin_head',                        [ $this, 'enqueue_styles' ] );
            add_action( 'admin_footer',                      [ $this, 'enqueue_scripts' ] );
            add_action( 'wp_ajax_h5vp_dismiss_promo_banner', [ $this, 'ajax_dismiss' ] );

            // Action links on plugins.php page
            $basename = defined( 'H5VP_PLUGIN_FILE_BASENAME' ) ? H5VP_PLUGIN_FILE_BASENAME : 'html5-video-player/html5-video-player.php';
            add_filter( 'plugin_action_links_' . $basename,         [ $this, 'add_plugin_action_link' ] );
            add_filter( 'network_admin_plugin_action_links_' . $basename, [ $this, 'add_plugin_action_link' ] );
        }

        /* ------------------------------------------------------------------ */
        /*  Screen, Expiration, Dismissal & Pro Helpers                       */
        /* ------------------------------------------------------------------ */

        /**
         * Check if current admin screen belongs to HTML5 Video Player, excluding the block editor / post edit screen
         */
        private function is_plugin_screen(): bool {
            $screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

            if ( $screen ) {
                // 1. Exclude Block Editor / Post Editor (Add New / Edit Player)
                if ( 'post' === $screen->base || ( method_exists( $screen, 'is_block_editor' ) && $screen->is_block_editor() ) ) {
                    return false;
                }

                // 2. Match videoplayer post type or submenu pages
                if ( isset( $screen->post_type ) && 'videoplayer' === $screen->post_type ) {
                    return true;
                }

                $id   = $screen->id ?? '';
                $base = $screen->base ?? '';

                if (
                    strpos( $id, 'videoplayer' ) !== false ||
                    strpos( $id, 'html5-video-player' ) !== false ||
                    strpos( $base, 'videoplayer' ) !== false ||
                    strpos( $base, 'html5-video-player' ) !== false
                ) {
                    return true;
                }
            }

            // Fallback for direct query parameters (excluding post edit pages)
            global $pagenow;
            if ( in_array( $pagenow, [ 'post.php', 'post-new.php' ], true ) ) {
                return false;
            }

            // phpcs:ignore WordPress.Security.NonceVerification.Recommended
            if ( isset( $_GET['post_type'] ) && 'videoplayer' === sanitize_key( $_GET['post_type'] ) ) {
                return true;
            }

            // phpcs:ignore WordPress.Security.NonceVerification.Recommended
            if ( isset( $_GET['page'] ) ) {
                // phpcs:ignore WordPress.Security.NonceVerification.Recommended
                $page = sanitize_key( $_GET['page'] );
                if ( strpos( $page, 'videoplayer' ) !== false || strpos( $page, 'html5-video-player' ) !== false ) {
                    return true;
                }
            }

            return false;
        }

        /**
         * Check if current date is past December 5, 2026
         */
        private function is_expired(): bool {
            $expiry_timestamp = strtotime( self::EXPIRATION_DATE );
            $current_time     = time();
            return ( $current_time > $expiry_timestamp );
        }

        /**
         * Check if current user has permanently dismissed the banner
         */
        private function is_dismissed(): bool {
            return (bool) get_user_meta( get_current_user_id(), self::DISMISSED_KEY, true );
        }

        /**
         * Check if Pro / Premium version is active
         */
        private function is_pro_active(): bool {
            if ( defined( 'H5VP_PRO_VER' ) || defined( 'H5VP_PRO_PLUGIN_DIR' ) ) {
                return true;
            }
            if ( function_exists( 'h5vp_fs' ) && h5vp_fs()->can_use_premium_code() ) {
                return true;
            }
            return false;
        }

        /**
         * Determine if the dashboard banner should be omitted
         */
        private function should_skip(): bool {
            // 1. Only show on HTML5 Video Player screens (excluding block editor)
            if ( ! $this->is_plugin_screen() ) {
                return true;
            }

            // 2. Automatically remove after Dec 5, 2026
            if ( $this->is_expired() ) {
                return true;
            }

            // 3. Never display again once dismissed by the user
            if ( $this->is_dismissed() ) {
                return true;
            }

            // 4. Hide for Pro / Premium users
            if ( $this->is_pro_active() ) {
                return true;
            }

            return false;
        }

        /* ------------------------------------------------------------------ */
        /*  Plugins.php Row Action Link                                       */
        /* ------------------------------------------------------------------ */

        /**
         * Add promotional upgrade link under plugin name in plugins.php
         */
        public function add_plugin_action_link( array $links ): array {
            if ( $this->is_expired() || $this->is_pro_active() ) {
                return $links;
            }

            $campaign_url = esc_url( self::PLUGINS_PAGE_URL );
            $link_text    = esc_html__( 'Black Friday Sale – 45% OFF', 'html5-video-player' );

            $links['h5vp_bfcm'] = sprintf(
                '<a href="%s" target="_blank" rel="noopener noreferrer" style="color: #d63638; font-weight: 700;">%s</a>',
                $campaign_url,
                $link_text
            );

            return $links;
        }

        /* ------------------------------------------------------------------ */
        /*  Pro CSS Styles (Design 5 - Roboto Typo, Zero Radius)              */
        /* ------------------------------------------------------------------ */

        public function enqueue_styles(): void {
            if ( $this->should_skip() ) { return; }
            ?>
            <style id="h5vp-promo-banner-css">
            #h5vp-promo-banner,
            #h5vp-promo-banner * {
                font-family: "Roboto", sans-serif !important;
                box-sizing: border-box !important;
            }

            #h5vp-promo-banner {
                --bpl-primary:        #146ef5;
                --bpl-primary-hover:  #0d5ecc;
                --bpl-secondary:      #ff7a00;
                --bpl-dark:           #070127;
                --bpl-text:           #1b2e4b;
                --bpl-muted:          #475569;

                background: #ffffff !important;
                border: 1px solid #cbd5e1 !important;
                border-left: 1px solid #cbd5e1 !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 16px rgba(7, 1, 39, 0.06), 0 1px 3px rgba(7, 1, 39, 0.04) !important;
                display: flex !important;
                align-items: stretch !important;
                min-height: 84px !important;
                overflow: hidden !important;
                position: relative !important;
                top: auto !important;
                left: auto !important;
                width: auto !important;
                max-width: 100% !important;
                height: auto !important;
                opacity: 1 !important;
                visibility: visible !important;
                margin: 16px 20px 20px 20px !important;
                padding: 0 !important;
                animation: h5vpBannerSlide .3s ease both !important;
                z-index: 10;
            }
            @keyframes h5vpBannerSlide {
                from { opacity: 0; transform: translateY(-6px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            /* Left Brand Ribbon Block */
            #h5vp-promo-banner .h5vp-brand-ribbon {
                width: 140px;
                min-width: 140px;
                background: linear-gradient(135deg, var(--bpl-primary) 0%, var(--bpl-dark) 100%);
                color: #ffffff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 12px 10px;
                gap: 6px;
                flex-shrink: 0;
            }
            #h5vp-promo-banner .h5vp-brand-ribbon img {
                width: 38px;
                height: 38px;
                object-fit: contain;
                border-radius: 6px;
                filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.35));
            }
            #h5vp-promo-banner .h5vp-brand-ribbon .h5vp-ribbon-title {
                font-size: 10.5px;
                font-weight: 800;
                letter-spacing: .7px;
                text-transform: uppercase;
                color: #ffffff;
                text-align: center;
                line-height: 1.2;
            }

            /* Main Content Zone */
            #h5vp-promo-banner .h5vp-content-zone {
                flex: 1;
                padding: 16px 24px;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                justify-content: center;
                gap: 10px;
                padding-right: 38px;
            }

            /* Left Text Stack */
            #h5vp-promo-banner .h5vp-text-stack {
                display: flex;
                flex-direction: column;
                gap: 6px;
                max-width: 960px;
            }
            #h5vp-promo-banner .h5vp-headline {
                font-size: 17.5px;
                font-weight: 700;
                color: var(--bpl-dark);
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 0;
                line-height: 1.35;
            }
            #h5vp-promo-banner .h5vp-desc {
                font-size: 13.5px;
                color: var(--bpl-muted);
                line-height: 1.55;
                margin: 0;
                max-width: 900px;
            }
            #h5vp-promo-banner .h5vp-discount-chip {
                background: #ffedd5;
                color: #c2410c;
                border: 1px solid #fed7aa;
                font-size: 11px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 12px;
                letter-spacing: .2px;
            }

            /* Feature Checklist */
            #h5vp-promo-banner .h5vp-feature-chips {
                display: flex;
                align-items: center;
                gap: 16px;
                font-size: 13px;
                color: var(--bpl-muted);
                flex-wrap: wrap;
                margin-top: 2px;
            }
            #h5vp-promo-banner .h5vp-feature-chips span {
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }
            #h5vp-promo-banner .h5vp-feature-chips .check-icon {
                color: #10b981;
                font-weight: 800;
                font-size: 13.5px;
            }

            /* CTA Action Button */
            #h5vp-promo-banner .h5vp-btn-cta {
                background: var(--bpl-primary) !important;
                color: #ffffff !important;
                padding: 10px 22px !important;
                border-radius: 6px !important;
                font-size: 13.5px !important;
                font-weight: 600 !important;
                text-decoration: none !important;
                box-shadow: 0 2px 8px rgba(20, 110, 245, 0.32) !important;
                transition: background-color .15s ease, transform .15s ease, box-shadow .15s ease !important;
                white-space: nowrap !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                line-height: 1.2 !important;
                margin-top: 2px !important;
            }
            #h5vp-promo-banner .h5vp-btn-cta:hover {
                background: var(--bpl-primary-hover) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 12px rgba(20, 110, 245, 0.45) !important;
            }

            /* Dismiss Button (×) */
            #h5vp-promo-banner .h5vp-banner-dismiss-btn {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                cursor: pointer;
                color: #94a3b8;
                font-size: 20px;
                line-height: 1;
                padding: 6px;
                transition: color .15s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
            }
            #h5vp-promo-banner .h5vp-banner-dismiss-btn:hover {
                color: var(--bpl-dark);
            }

            /* Responsive */
            @media (max-width: 960px) {
                #h5vp-promo-banner .h5vp-brand-ribbon {
                    width: 110px;
                    min-width: 110px;
                }
            }
            @media (max-width: 900px) {
                #h5vp-promo-banner .h5vp-desc-break {
                    display: none;
                }
            }
            @media (max-width: 782px) {
                #h5vp-promo-banner {
                    margin: 12px 10px 16px 10px !important;
                    flex-direction: column;
                    align-items: stretch;
                }
                #h5vp-promo-banner .h5vp-brand-ribbon {
                    width: 100%;
                    flex-direction: row;
                    justify-content: flex-start;
                    padding: 8px 16px;
                }
                #h5vp-promo-banner .h5vp-content-zone {
                    flex-direction: column;
                    align-items: flex-start;
                    padding: 14px 16px;
                }
            }
            </style>
            <?php
        }

        /* ------------------------------------------------------------------ */
        /*  Permanent Dismiss Script (AJAX + Animation)                       */
        /* ------------------------------------------------------------------ */

        public function enqueue_scripts(): void {
            if ( $this->should_skip() ) { return; }
            $dismiss_nonce = wp_create_nonce( 'h5vp_dismiss_promo' );
            $ajax_url      = admin_url( 'admin-ajax.php' );
            ?>
            <script id="h5vp-promo-banner-js">
            (function () {
                var btn = document.getElementById('h5vp-banner-close');
                if (!btn) return;
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var banner = document.getElementById('h5vp-promo-banner');
                    if (banner) {
                        banner.style.transition = 'opacity .25s ease, transform .25s ease';
                        banner.style.opacity    = '0';
                        banner.style.transform  = 'translateY(-6px)';
                        setTimeout(function() { banner.remove(); }, 260);
                    }
                    var fd = new FormData();
                    fd.append('action', 'h5vp_dismiss_promo_banner');
                    fd.append('nonce',  '<?php echo esc_js( $dismiss_nonce ); ?>');
                    fetch('<?php echo esc_url( $ajax_url ); ?>', {
                        method: 'POST',
                        credentials: 'same-origin',
                        body: fd
                    });
                });
            })();
            </script>
            <?php
        }

        /* ------------------------------------------------------------------ */
        /*  Render Single Banner (Design 5)                                   */
        /* ------------------------------------------------------------------ */

        public function render(): void {
            if ( $this->should_skip() ) { return; }

            $coupon_url = esc_url( self::DASHBOARD_URL );
            $icon_url   = esc_url( H5VP_PLUGIN_DIR . 'admin/img/promo-icon.png' );
            ?>
            <div id="h5vp-promo-banner" class="notice">

                <!-- Left Asymmetric Brand Ribbon -->
                <div class="h5vp-brand-ribbon">
                    <img src="<?php echo esc_url( $icon_url ); ?>" alt="<?php esc_attr_e( 'HTML5 Video Player', 'html5-video-player' ); ?>" />
                    <span class="h5vp-ribbon-title"><?php esc_html_e( 'HTML5 Video Player', 'html5-video-player' ); ?></span>
                </div>

                <!-- Main Content Zone -->
                <div class="h5vp-content-zone">
                    <div class="h5vp-text-stack">
                        <div class="h5vp-headline">
                            <span><?php esc_html_e( "HTML5 Video Player's Biggest Black Friday Sale is Live – Up to 45% OFF!", 'html5-video-player' ); ?></span>
                        </div>
                        <p class="h5vp-desc">
                            <?php esc_html_e( 'The biggest deal of the year is here! This is your once-a-year opportunity to upgrade to HTML5 Video Player Pro at an exclusive price.', 'html5-video-player' ); ?> <br class="h5vp-desc-break" /><?php esc_html_e( 'Unlock quality switcher, sticky player, video ads (VAST), and everything you need to take your video playback to the next level!', 'html5-video-player' ); ?>
                        </p>
                        <div class="h5vp-feature-chips">
                            <span><strong class="check-icon">✓</strong> <?php esc_html_e( 'Quality Switcher', 'html5-video-player' ); ?></span>
                            <span><strong class="check-icon">✓</strong> <?php esc_html_e( 'Sticky Video Player', 'html5-video-player' ); ?></span>
                            <span><strong class="check-icon">✓</strong> <?php esc_html_e( 'Video Ads (VAST)', 'html5-video-player' ); ?></span>
                            <span><strong class="check-icon">✓</strong> <?php esc_html_e( 'Password Protection', 'html5-video-player' ); ?></span>
                        </div>
                    </div>

                    <!-- CTA Button -->
                    <a href="<?php echo esc_url( $coupon_url ); ?>" target="_blank" rel="noopener noreferrer" class="h5vp-btn-cta">
                        <?php esc_html_e( 'Unlock PRO Features →', 'html5-video-player' ); ?>
                    </a>
                </div>

                <!-- Dismiss Button -->
                <button id="h5vp-banner-close"
                        class="h5vp-banner-dismiss-btn"
                        title="<?php esc_attr_e( 'Dismiss', 'html5-video-player' ); ?>"
                        aria-label="<?php esc_attr_e( 'Dismiss banner', 'html5-video-player' ); ?>">
                    &times;
                </button>

            </div>
            <?php
        }

        /* ------------------------------------------------------------------ */
        /*  AJAX Handler: Permanent Dismissal                                 */
        /* ------------------------------------------------------------------ */

        public function ajax_dismiss(): void {
            check_ajax_referer( 'h5vp_dismiss_promo', 'nonce' );
            update_user_meta( get_current_user_id(), self::DISMISSED_KEY, 1 );
            wp_send_json_success();
        }
    }

    new H5VP_PromoBanner();
}
