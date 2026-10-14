<?php

namespace H5VP\Field;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

class QuickPlayer
{
    private $prefix = 'h5vp_quick';
    public function register()
    {
        add_action('init', [$this, 'register_fields'], 0);
    }

    public function register_fields()
    {
        if (class_exists('\CSF')) {

            // Create options
            \CSF::createOptions($this->prefix, array(
                'menu_title' => 'Quick Player',
                'menu_slug' => 'html5vp_quick_player',
                'menu_parent' => 'edit.php?post_type=videoplayer',
                'menu_type' => 'submenu',
                'theme' => 'light',
                'data_type' => 'unserialize',
                'show_all_options' => false,
                'save_defaults' => true,
                'framework_class' => 'h5vp_quick_player',
                'framework_title' => 'HTML5 Quick Video Player Preset',
                'show_bar_menu' => false,
            ));

            $this->quickPlayer();
        }
    }

    public function quickPlayer()
    {
        \CSF::createSection($this->prefix, array(
            'title' => 'Quick Player',
            'fields' => array(
                array(
                    'type' => 'heading',
                    'title' => ' ',
                    'content' => '<div style="display:flex;justify-content:end;gap:5px"><a href="https://bplugins.com/docs/html5-video-player/how-to-use/#quick-player" target="_blank" class="button button-primary" rel="noopener noreferrer"> Full Documentation</a></div>',
                ),
                array(
                    'title' => 'Shortcode',
                    'type' => 'content',
                    'content' => '<p class="h5vp_quick_shortcode"><code>[video_player file=yourvideo poster=poster.jpeg source=library]</code> <svg class="h5vp_shortcode_copy_btn" data-type="icon" data-clipboard-text="[video_player file=yourvideo poster=poster.jpeg source=library]" width="22px" height="22px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M8 4V16C8 17.1046 8.89543 18 10 18L18 18C19.1046 18 20 17.1046 20 16V7.24162C20 6.7034 19.7831 6.18789 19.3982 5.81161L16.0829 2.56999C15.7092 2.2046 15.2074 2 14.6847 2H10C8.89543 2 8 2.89543 8 4Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V9C4 7.89543 4.89543 7 6 7H8" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </svg></p> <p>Use this shortcode to show video in your website quickly. change the source to youtube/vimeo to show youtube/vimeo video</p>',
                ),
                array(
                    'id' => 'h5vp_reset_on_end_quick',
                    'title' => 'Reset On End',
                    'type' => 'switcher',
                    'default' => '1',
                ),
                array(
                    'id' => 'h5vp_player_width_quick',
                    'title' => 'Player Width',
                    'type' => 'spinner',
                    'unit' => 'px',
                    'step' => '50',
                    'max' => '5000',
                    'desc' => 'set the player width. Height will be calculate base on the value. Left blank for Responsive player',
                ),
                array(
                    'id' => 'h5vp_align_quick',
                    'title' => __('Alignment', 'html5-video-player'),
                    'type' => 'button_set',
                    'options' => array(
                        '' => __('Default', 'html5-video-player'),
                        'left' => __('Left', 'html5-video-player'),
                        'center' => __('Center', 'html5-video-player'),
                        'right' => __('Right', 'html5-video-player'),
                    ),
                    'desc' => __('Position the player inside its container. Only visible once the player width is narrower than the container. Override a single shortcode with align="center", or opt one out of this default with align="none".', 'html5-video-player'),
                    // Empty by default so existing [video_player] shortcodes keep
                    // rendering exactly as they do now.
                    'default' => '',
                ),
                array(
                    'id' => 'h5vp_auto_hide_control_quick',
                    'title' => 'Auto Hide Control',
                    'type' => 'switcher',
                    'desc' => 'On if you want the controls (such as a play/pause button etc) hide automaticaly.',
                    'default' => true
                ),
                array(
                    'id' => 'h5vp_playsinline_quick',
                    'title' => 'Allow Inline Playback on iOS',
                    'type' => 'switcher',
                    'desc' => 'Allow inline playback on iOS. Note this has no effect on iPadOS.',
                    'default' => '1',
                ),
                array(
                    'id' => 'h5vp_preload_quick',
                    'title' => 'Preload',
                    'type' => 'radio',
                    'options' => array(
                        'auto' => 'Auto - Browser should load the entire file when the page loads.',
                        'metadata' => 'Metadata - Browser should load only meatadata when the page loads.',
                        'none' => 'None - Browser should NOT load the file when the page loads.',
                    ),
                    'desc' => 'Specify how the video file should be loaded when the page loads.',
                    'default' => 'metadata',
                ),
                array(
                    'type' => 'content',
                    'content' => '
                    <div class="h5vp-pro-notice-box">
                        <h4 class="h5vp-pro-notice-title">🚀 Get More with Premium Version</h4>
                        <p class="h5vp-pro-notice-desc">The following features are available in the Premium Version:</p>
                        <ul class="h5vp-pro-notice-list">
                            <li><strong>Apply Html5 Video Player for all previous videos</strong></li>
                            <li><strong>Subtitles support:</strong> Add multiple subtitle/caption tracks.</li>
                            <li><strong>Video Quality switcher:</strong> Let viewers switch between multiple video qualities.</li>
                            <li><strong>Page Load Optimizer:</strong> Improve page speed by optimizing video loading.</li>
                            <li><strong>Custom Download URL:</strong> Set a custom URL for the download button.</li>
                            <li><strong>Autoplay when visible on screen:</strong> Start playback when the player scrolls into view.</li>
                            <li><strong>Disable Pause:</strong> Prevent viewers from pausing the video.</li>
                            <li><strong>Show Thumbnail on Pause:</strong> Display a thumbnail when the video is paused.</li>
                            <li><strong>Sticky on Scroll:</strong> Keep the player visible while scrolling.</li>
                            <li><strong>Google VAST Tag URL:</strong> Show video ads via Google VAST tags.</li>
                            <li><strong>Chapters:</strong> Add chapter markers to navigate the video.</li>
                            <li><strong>Display Overlay before or after playback:</strong> Show a custom overlay before or after the video.</li>
                            <li><strong>Enable End Screen:</strong> Show an end screen when the video finishes.</li>
                            <li><strong>Password Protected:</strong> Restrict video access with a password.</li>
                            <li><strong>Enable Popup Player:</strong> Play video in a popup/modal window.</li>
                            <li><strong>Watermark Support:</strong> Add a watermark to your video.</li>
                            <li><strong>Additional ID/CSS Class:</strong> Add custom ID and CSS classes for styling.</li>
                        </ul>
                        <a href="https://bplugins.com/products/html5-video-player/pricing/" target="_blank" class="h5vp-pro-notice-button">Get Premium Version</a>
                    </div>
                ',
                )
            ),
        ));
    }
}