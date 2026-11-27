<?php

namespace H5VP\Helper;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

class Block
{

    private static $_instance = null;
    public static function getInstance()
    {
        if (self::$_instance == null) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function classic_to_gutenberg_block($id)
    {
        $provider = $this->get_post_meta($id, 'h5vp_video_source', 'self-hosted');
        $block_name = in_array($provider, ['amazons3', 'self-hosted', 'library']) ? 'video' : $provider;
        $width = $this->get_post_meta($id, 'h5vp_player_width_playerio') ? $this->get_post_meta($id, 'h5vp_player_width_playerio') . 'px' : '100%';
        $source = $this->get_post_meta($id, 'h5vp_video_link');

        if (in_array($provider, ['vimeo', 'youtube'])) {
            $source = $this->get_post_meta($id, 'h5vp_video_link_youtube_vimeo', '');
        }

        $align = h5vp_sanitize_align($this->get_post_meta($id, 'h5vp_align_playerio', ''));

        $subtitles = [];
        $caption_file = $this->get_post_meta($id, 'h5vp_caption_file');
        if (!empty($caption_file)) {
            $caption_label = $this->get_post_meta($id, 'h5vp_caption_label', 'English/en');
            $subtitles[] = [
                'label' => !empty($caption_label) ? (string) $caption_label : 'English/en',
                'caption_file' => esc_url_raw((string) $caption_file),
            ];
        }

        $block = [
            'blockName' => "html5-player/$block_name",
            'attrs' => [
                'is_classic' => true,
                "provider" => $provider === 'library' ? 'self-hosted' : $provider,
                "imported" => false,
                "clientId" => "",
                "uniqueId" => wp_unique_id('h5vp'),
                "source" => $source,
                "poster" => $this->get_post_meta($id, 'h5vp_video_thumbnails', ''),
                "subtitle" => $subtitles,
                "skin" => 'default',
                "options" => [
                    "controls" => $this->get_post_meta($id, 'h5vp_controls', ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen']),
                    "settings" => ["captions", "quality", "speed", "loop"],
                    "loadSprite" => true,
                    "autoplay" => $this->get_post_meta($id, 'h5vp_auto_play_playerio', false, true),
                    // Unset meta ('' from players saved before the field existed)
                    // must stay true — the previous behavior was hardcoded true.
                    "playsinline" => $this->get_post_meta($id, 'h5vp_playsinline_playerio', '1') == '1',
                    "seekTime" => 10,
                    "volume" => 1,
                    "muted" => $this->get_post_meta($id, 'h5vp_muted_playerio', false, true),
                    "hideControls" => $this->get_post_meta($id, 'h5vp_auto_hide_control_playerio', false, true),
                    "resetOnEnd" => $this->get_post_meta($id, 'h5vp_reset_on_end_playerio', false, true),
                    "tooltips" => [
                        "controls" => true,
                        "seek" => true
                    ],
                    "ratio" => $this->get_post_meta($id, 'h5vp_ratio', null),
                    "storage" => [
                        "enabled" => true,
                        "key" => "plyr"
                    ],
                    "loop" => [
                        "active" => $this->get_post_meta($id, 'h5vp_repeat_playerio', false) === 'loop',
                    ],
                    "preload" => $this->get_post_meta($id, 'h5vp_preload_playerio', 'metadata'),
                    "speed" => [
                        "options" => explode(',', (string) $this->get_post_meta($id, 'h5vp_speed', '0.5,0.75,1,1.25,1.5,1.75,2,4'))
                    ]
                ],
                "features" => [],

                "styles" => [
                    "plyr_wrapper" => [
                        "width" => $width,
                        "borderRadius" => $this->get_post_meta($id, 'h5vp_round_corner', '0') . 'px',
                        "overflow" => "hidden"
                    ]
                ],

                "ratio" => null,

                "brandColor" => "#00B3FF",
                "radius" => [
                    "number" => 20,
                    "unit" => "px"
                ],

                "preload" => $this->get_post_meta($id, 'h5vp_preload_playerio', 'metadata'),

            ],
            "innerBlocks" => [],
            "innerHTML" => "",
            "innerContent" => [],
        ];

        // Core's alignment support keys off array_key_exists(), not empty(), so
        // handing it an empty string would render a bare "align" class. Players
        // saved before this field existed resolve to '' and must stay untouched.
        if ($align !== '') {
            $block['attrs']['align'] = $align;
        }

        // Opt-in options: players saved before these fields existed have no meta, and then nothing is added.
        $default_volume = get_post_meta($id, 'h5vp_default_volume', true);
        if ('' !== $default_volume && is_numeric($default_volume)) {
            $block['attrs']['options']['defaultVolume'] = (int) max(0, min(100, round((float) $default_volume)));
        }
        if ('cover' === get_post_meta($id, 'h5vp_video_fit', true)) {
            $block['attrs']['options']['fit'] = 'cover';
        }

        return $block;
    }

    public function video_player_to_gutenberg_block($attrs)
    {

        $quick = h5vp_get_option('h5vp_quick');
        $get_attr = $this->get_attr($attrs);

        $block_name = $get_attr('source', 'library') == 'library' ? 'video' : $get_attr('source', 'library');
        // A shortcode-supplied width flows into an inline CSS value; constrain
        // it to a number with an explicit unit, falling back to a responsive
        // 100% when it is unset or malformed.
        $width = $get_attr('width', $quick('h5vp_player_width_quick'));
        if (is_string($width) && preg_match('/^\d+(\.\d+)?(px|%|em|rem|vw)$/', $width)) {
            // already a valid CSS length — keep as-is
        } elseif (is_numeric($width)) {
            $width = (int) $width . 'px';
        } else {
            $width = '100%';
        }

        $code_controls = isset($attrs['controls']) ? explode(',', $get_attr('controls', '')) : null;
        $controls = [];

        if (is_array($code_controls)) {
            foreach ($code_controls as $control) {
                array_push($controls, trim($control));
            }
        }

        if (count($controls) == 0) {
            $controls = ['play-large', 'play', 'progress', 'duration', 'current-time', 'mute', 'volume', 'captions', 'settings', 'fullscreen'];
        }

        $align = h5vp_sanitize_align(
            isset($attrs['align']) ? $attrs['align'] : $quick('h5vp_align_quick', '')
        );

        $shortcode_subtitles = [];
        $caption_file = $get_attr('caption', $get_attr('subtitle', ''));
        if (!empty($caption_file)) {
            $caption_label = $get_attr('caption_label', $get_attr('subtitle_label', 'English/en'));
            $shortcode_subtitles[] = [
                'label' => $caption_label ?: 'English/en',
                'caption_file' => esc_url_raw((string) $caption_file),
            ];
        }

        $block = [
            'blockName' => "html5-player/$block_name",
            'attrs' => [
                "provider" => $get_attr('source'),
                "uniqueId" => wp_unique_id('h5vp'),
                "source" => $get_attr('file', $get_attr('src', $get_attr('mp4'))),
                "poster" => $get_attr('poster'),
                "subtitle" => $shortcode_subtitles,
                "options" => [
                    "controls" => $controls,
                    "loadSprite" => true,
                    "autoplay" => $get_attr('autoplay', 'false', true),
                    "playsinline" => $get_attr('playsinline', $quick('h5vp_playsinline_quick', '1'), true),
                    "muted" => (bool) $get_attr('muted', $quick('h5vp_muted_quick', '0'), true),
                    "hideControls" => $get_attr('hide_controls', $quick('h5vp_auto_hide_control_quick', '1'), true),
                    "resetOnEnd" => $get_attr('reset_on_end', $quick('h5vp_reset_on_end_quick', '1'), true),
                    // ratio="1:1" (or aspect_ratio): the shape of the frame. Only a plain "a:b" value is accepted.
                    "ratio" => (function ($value) {
                        $value = is_string($value) ? trim($value) : '';
                        return preg_match('/^\d{1,2}[:\/]\d{1,2}$/', $value) ? str_replace('/', ':', $value) : null;
                    })($attrs['ratio'] ?? $attrs['aspect_ratio'] ?? null),
                    "loop" => [
                        "active" => $get_attr('repeat', $quick('h5vp_repeat_quick', '0'), true),
                    ],
                    "preload" => $get_attr('preload', $quick('h5vp_preload_quick', 'metadata')),
                ],
                "features" => [],
                "styles" => [
                    "plyr_wrapper" => [
                        'width' => $width,
                        "borderRadius" => "0px",
                        "overflow" => "hidden"
                    ]
                ],

            ],

            "innerBlocks" => [],
            "innerHTML" => "",
            "innerContent" => [],
        ];

        // See classic_to_gutenberg_block(): only set the key once it has a value.
        if ($align !== '') {
            $block['attrs']['align'] = $align;
        }

        // default_volume="50" (percent). get_attr() treats "0" as empty, so read the attribute directly.
        if (isset($attrs['default_volume']) && is_numeric($attrs['default_volume'])) {
            $block['attrs']['options']['defaultVolume'] = (int) max(0, min(100, round((float) $attrs['default_volume'])));
        }
        // fit="cover": fill the frame and crop the edges (anything else keeps the whole video visible).
        if (isset($attrs['fit']) && 'cover' === $attrs['fit']) {
            $block['attrs']['options']['fit'] = 'cover';
        }

        return $block;
    }

    function get_post_meta($id, $key, $default = null, $is_boolean = false)
    {
        $meta = get_post_meta($id, $key, true);

        if ($is_boolean) {
            return $meta == '1' ? true : false;
        }
        if ($meta == '') {
            $meta = $default;
        }
        return $meta;
    }

    function get_attr($attrs)
    {
        return function ($key, $default = false, $is_boolean = false) use ($attrs) {
            $value = isset($attrs[$key]) && !empty($attrs[$key]) ? $attrs[$key] : $default;
            if ($is_boolean) {
                // $value can be true or 1 or false or 0
                $value = $value === 'true' || $value === '1' ? true : false;
            }
            return $value;
        };
    }
}