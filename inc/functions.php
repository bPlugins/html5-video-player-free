<?php
if (!defined('ABSPATH'))
    exit; // Exit if accessed directly


if (!function_exists('h5vp_get_option')) {
    function h5vp_get_option($key = 'h5vp_option')
    {
        $option = get_option($key);

        return function ($key, $default = null, $is_boolean = false) use ($option) {
            if (isset($option[$key])) {
                if ($is_boolean) {
                    return $option[$key] === '1';
                }
                return $option[$key];
            }
            return $default;
        };
    }
}

if (!function_exists(('h5vp_process_block_attributes'))) {
    function h5vp_process_block_attributes($attributes)
    {
        $option = h5vp_get_option('h5vp_option');

        $attributes['features']['passwordProtected']['password'] = null;

        // Block attributes can originate from shortcodes / imports. Force a safe
        // URL scheme on source + poster so a javascript: URI can never reach
        // view.js and become a stored-XSS vector.
        if (!empty($attributes['source'])) {
            $attributes['source'] = esc_url_raw((string) $attributes['source']);
        }
        if (!empty($attributes['poster'])) {
            $attributes['poster'] = esc_url_raw((string) $attributes['poster']);
        }

        if (!empty($attributes['subtitle']) && is_array($attributes['subtitle'])) {
            $cleaned_subtitles = [];
            foreach ($attributes['subtitle'] as $sub) {
                if (!empty($sub['caption_file'])) {
                    $cleaned_subtitles[] = [
                        'label' => sanitize_text_field($sub['label'] ?? 'English/en'),
                        'caption_file' => esc_url_raw((string) $sub['caption_file']),
                    ];
                }
            }
            $attributes['subtitle'] = $cleaned_subtitles;
        } else {
            $attributes['subtitle'] = [];
        }

        if (isset($attributes['styles'])) {
            $attributes['styles']['.plyr'] = [
                '--plyr-color-main' => $option('h5vp_player_primary_color', '#00b2ff')
            ];
        }

        // The frontend writes 'styles' and 'uniqueId' straight into a <style>
        // element. Attributes originate from post_content, which a
        // contributor-level user can edit directly, so both need to be safe
        // as CSS selectors/declarations before they ever reach the browser.
        if (!empty($attributes['uniqueId'])) {
            $attributes['uniqueId'] = preg_replace('/[^A-Za-z0-9_-]/', '', (string) $attributes['uniqueId']);
        }

        if (!empty($attributes['styles']) && is_array($attributes['styles'])) {
            $clean_styles = [];
            foreach ($attributes['styles'] as $selector => $declarations) {
                if (!is_array($declarations)) {
                    continue;
                }
                $selector = preg_replace('/[^A-Za-z0-9_\-.#:>\s\[\]="\']/', '', (string) $selector);
                if ('' === $selector) {
                    continue;
                }
                foreach ($declarations as $prop => $value) {
                    $prop = preg_replace('/[^A-Za-z0-9-]/', '', (string) $prop);
                    if ('' === $prop || !is_scalar($value)) {
                        continue;
                    }
                    $value = (string) $value;
                    // Reject anything that could close the <style> element or
                    // open a new, attacker-controlled rule.
                    if (preg_match('/[<>{};@]/', $value)) {
                        continue;
                    }
                    $clean_styles[$selector][$prop] = $value;
                }
            }
            $attributes['styles'] = $clean_styles;
        }

        $attributes['skin'] = 'default';
        unset($attributes['quality']);
        unset($attributes['qualities']);

        if (class_exists('\H5VP\Model\Video')) {
            $videoInstance = new \H5VP\Model\Video();
            $attributes['video_id'] = $videoInstance->get_id(['src' => $attributes['source']]);
        }

        return $attributes;
    }
}


if (!function_exists('h5vp_sanitize_align')) {
    /**
     * Normalise a player alignment value.
     * @param mixed $align Raw stored or user-supplied value.
     * @return string One of left|center|right|wide|full, or '' when unset.
     */
    function h5vp_sanitize_align($align)
    {
        if (!is_string($align)) {
            return '';
        }
        $align = strtolower(trim($align));

        return in_array($align, ['left', 'center', 'right', 'wide', 'full'], true) ? $align : '';
    }
}

if (!function_exists('h5vp_is_hls_source')) {
    /**
     * Whether a source URL is an HLS (.m3u8) stream.
     * @param mixed $url Source URL.
     * @return bool
     */
    function h5vp_is_hls_source($url)
    {
        if (!is_string($url) || '' === $url) {
            return false;
        }

        return strpos(strtolower($url), '.m3u8') !== false;
    }
}

if (!function_exists('h5vp_maybe_enqueue_hls')) {
    /**
     * Enqueue hls.js only when a source on this page actually needs it.
     * @param string|array $sources One source URL, or a list of them.
     * @return bool True when hls.js was enqueued.
     */
    function h5vp_maybe_enqueue_hls($sources)
    {
        foreach ((array) $sources as $source) {
            if (h5vp_is_hls_source($source)) {
                wp_enqueue_script('bplugins-hls');

                return true;
            }
        }

        return false;
    }
}

if (!function_exists('h5vp_parse_ratio')) {
    /** Parse a stored ratio ("16:9", "4/3") into [width, height], or null. */
    function h5vp_parse_ratio($ratio)
    {
        if (!is_string($ratio) && !is_numeric($ratio)) {
            return null;
        }

        if (!preg_match('#^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$#', trim((string) $ratio), $matches)) {
            return null;
        }

        // A zero on either side is not a ratio and would collapse the box.
        if ((float) $matches[1] <= 0 || (float) $matches[2] <= 0) {
            return null;
        }

        return [$matches[1] + 0, $matches[2] + 0];
    }
}

if (!function_exists('h5vp_reserved_space')) {
    /**
     * Class + inline style that hold the player's box before the script mounts it, so the page
     * doesn't jump (CLS) when the player appears.
     * @param mixed  $ratio        Stored player ratio; defaults to 16:9.
     * @param string $player_width Player width (e.g. "100%", "80%", "640px").
     * @return array{class: string, style: string}
     */
    function h5vp_reserved_space($ratio, $player_width = '')
    {
        list($width, $height) = h5vp_parse_ratio($ratio) ?: [16, 9];

        $player_width = is_string($player_width) ? trim($player_width) : '';

        if (preg_match('#^\d*\.?\d+(px|rem|em|vw|vh|vmin|vmax|pt|pc|cm|mm|in|q|ch|ex)$#i', $player_width)) {
            return [
                'class' => 'h5vp-reserving-space h5vp-reserving-fixed',
                'style' => sprintf('--h5vp-reserved-height:calc(%s * %s / %s);', $player_width, $height, $width),
            ];
        }

        // A narrower percentage player sits in a full-width block: scale the reserved height to match.
        if (preg_match('#^(\d*\.?\d+)%$#', $player_width, $matches) && (float) $matches[1] > 0 && (float) $matches[1] < 100) {
            $height = round($height * (float) $matches[1] / 100, 4);
        }

        return [
            'class' => 'h5vp-reserving-space',
            'style' => sprintf('--h5vp-reserved-ratio:%s / %s;', $width, $height),
        ];
    }
}

if (!function_exists('h5vp_css_aspect_ratio')) {
    /** Convert a stored player ratio into a value CSS `aspect-ratio` accepts. */
    function h5vp_css_aspect_ratio($ratio, $fallback = '16 / 9')
    {
        $parsed = h5vp_parse_ratio($ratio);

        return $parsed ? $parsed[0] . ' / ' . $parsed[1] : $fallback;
    }
}

if (!function_exists('h5vp_embed_provider')) {
    /**
     * Which embed provider a player uses: 'youtube', 'vimeo', or '' for self-hosted media.
     * Mirrors the front end's provider detection (src/hooks/useVideoSource.ts).
     */
    function h5vp_embed_provider($source, $provider = '')
    {
        if (in_array($provider, ['youtube', 'vimeo'], true)) {
            return $provider;
        }
        if (!empty($provider) && 'library' !== $provider) {
            return '';
        }
        if (h5vp_youtube_id($source)) {
            return 'youtube';
        }
        if (h5vp_vimeo_id($source)) {
            return 'vimeo';
        }

        return '';
    }
}

if (!function_exists('h5vp_youtube_id')) {
    /** Extract the 11-character video id from a YouTube URL or bare id. */
    function h5vp_youtube_id($source)
    {
        if (!is_string($source) || '' === $source) {
            return '';
        }
        if (preg_match('/^[a-zA-Z0-9_-]{11}$/', $source)) {
            return $source;
        }
        if (preg_match('#^(?:https?:)?//(?:www\.|m\.|music\.)?(?:youtube(?:-nocookie)?\.com/(?:watch\?(?:[^\#\s]*&)?v=|embed/|v/|shorts/|live/)|youtu\.be/)([a-zA-Z0-9_-]{11})#i', $source, $match)) {
            return $match[1];
        }

        return '';
    }
}

if (!function_exists('h5vp_vimeo_id')) {
    /** Extract the numeric video id from a Vimeo URL. */
    function h5vp_vimeo_id($source)
    {
        if (is_string($source) && preg_match('#^(?:https?:)?//(?:www\.)?(?:player\.)?vimeo\.com/(?:.*/)?(\d+)#i', $source, $match)) {
            return $match[1];
        }

        return '';
    }
}

if (!function_exists('h5vp_embed_thumbnail')) {
    /**
     * Thumbnail for a YouTube/Vimeo player, shown until the visitor presses play so the embed's
     * ~1MB of third-party scripts isn't downloaded on page load. Vimeo needs one oEmbed lookup,
     * cached (including failures, e.g. private videos) so it never runs on every page view.
     */
    function h5vp_embed_thumbnail($source, $provider)
    {
        if ('youtube' === $provider) {
            $id = h5vp_youtube_id($source);
            return $id ? 'https://i.ytimg.com/vi/' . rawurlencode($id) . '/hqdefault.jpg' : '';
        }

        if ('vimeo' !== $provider) {
            return '';
        }

        $id = h5vp_vimeo_id($source);
        if (!$id) {
            return '';
        }

        $cache_key = 'h5vp_vimeo_thumb_' . $id;
        $cached = get_transient($cache_key);
        if (false !== $cached) {
            return (string) $cached;
        }

        // The simple v2 API (also used for titles, see Model\Video) first; oEmbed as the fallback.
        $thumbnail = '';
        $response = wp_remote_get('https://vimeo.com/api/v2/video/' . rawurlencode($id) . '.json', ['timeout' => 3]);
        if (!is_wp_error($response) && 200 === (int) wp_remote_retrieve_response_code($response)) {
            $data = json_decode(wp_remote_retrieve_body($response), true);
            if (!empty($data[0]['thumbnail_large']) && is_string($data[0]['thumbnail_large'])) {
                $thumbnail = esc_url_raw($data[0]['thumbnail_large']);
            }
        }
        if (!$thumbnail) {
            $response = wp_remote_get(
                add_query_arg(['url' => rawurlencode('https://vimeo.com/' . $id), 'width' => 1280], 'https://vimeo.com/api/oembed.json'),
                ['timeout' => 3]
            );
            if (!is_wp_error($response) && 200 === (int) wp_remote_retrieve_response_code($response)) {
                $data = json_decode(wp_remote_retrieve_body($response), true);
                if (!empty($data['thumbnail_url']) && is_string($data['thumbnail_url'])) {
                    $thumbnail = esc_url_raw($data['thumbnail_url']);
                }
            }
        }

        set_transient($cache_key, $thumbnail, $thumbnail ? WEEK_IN_SECONDS : 6 * HOUR_IN_SECONDS);

        return $thumbnail;
    }
}

if (!function_exists('h5vp_preconnect')) {
    /**
     * Ask the browser to open the connection to a third-party image host early (the YouTube/Vimeo
     * thumbnail is usually the page's largest image). Takes effect when the player is rendered before
     * <head> is printed — block themes; otherwise it is simply skipped.
     */
    function h5vp_preconnect($url)
    {
        static $hosts = [];
        $host = is_string($url) ? wp_parse_url($url, PHP_URL_HOST) : '';
        if (!$host || isset($hosts[$host]) || did_action('wp_head')) {
            return;
        }
        $hosts[$host] = true;

        add_filter('wp_resource_hints', function ($urls, $relation_type) use ($host) {
            if ('preconnect' === $relation_type) {
                $urls[] = ['href' => 'https://' . $host];
            }
            return $urls;
        }, 10, 2);
    }
}

if (!function_exists('h5vp_player_placeholder')) {
    /**
     * Server-rendered stand-in for a player: holds the exact box (no layout shift) and shows the
     * poster / embed thumbnail with a play button until the front end mounts the real player.
     * The front end swaps it out on mount (src/blocks/view.tsx).
     */
    function h5vp_player_placeholder($attributes, $thumbnail = '')
    {
        $wrapper = isset($attributes['styles']['plyr_wrapper']) && is_array($attributes['styles']['plyr_wrapper']) ? $attributes['styles']['plyr_wrapper'] : [];
        $image = !empty($attributes['poster']) ? $attributes['poster'] : $thumbnail;

        // Only plain CSS lengths reach the inline style.
        $length = '\d*\.?\d+(?:%|px|rem|em|vw|vh|vmin|vmax)?';

        $style = 'aspect-ratio:' . h5vp_css_aspect_ratio($attributes['options']['ratio'] ?? null) . ';';
        if (!empty($wrapper['width']) && is_string($wrapper['width']) && preg_match('#^' . $length . '$#', trim($wrapper['width']))) {
            $style .= 'width:' . trim($wrapper['width']) . ';';
        }
        if (!empty($wrapper['borderRadius']) && is_string($wrapper['borderRadius']) && preg_match('#^' . $length . '(?:\s+' . $length . '){0,3}$#', trim($wrapper['borderRadius']))) {
            $style .= 'border-radius:' . trim($wrapper['borderRadius']) . ';';
        }
        // A real <img> rather than a CSS background: the browser finds it while parsing the HTML (faster LCP),
        // and players further down the page lazy-load theirs. Only the first player on the page loads eagerly.
        static $h5vp_placeholder_count = 0;
        $h5vp_placeholder_count++;
        $is_first = 1 === $h5vp_placeholder_count;

        ob_start();
        ?>
        <div class="preload_poster h5vp-placeholder" role="button" tabindex="0" aria-label="<?php echo esc_attr__('Play video', 'html5-video-player'); ?>" style="<?php echo esc_attr($style); ?>">
            <?php if ($image) { ?>
                <img class="h5vp-placeholder-image" src="<?php echo esc_url($image); ?>" alt="" decoding="async" <?php echo $is_first ? 'fetchpriority="high"' : 'loading="lazy"'; ?> style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;" />
            <?php } ?>
            <span class="h5vp-placeholder-play" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M4.79 2.09A.5.5 0 0 0 4 2.5v10a.5.5 0 0 0 .79.41l7-5a.5.5 0 0 0 0-.82l-7-5Z" /></svg>
            </span>
        </div>
        <?php
        return (string) ob_get_clean();
    }
}

if (!function_exists('h5vp_convert_duration_to_iso8601')) {
    function h5vp_convert_duration_to_iso8601($duration)
    {
        // If input is already numeric, treat as seconds
        if (is_numeric($duration)) {
            $hours = floor($duration / 3600);
            $minutes = floor(($duration % 3600) / 60);
            $seconds = $duration % 60;
        } else {
            // Parse HH:MM:SS, MM:SS, or SS format
            $parts = array_reverse(explode(':', $duration));
            $seconds = isset($parts[0]) ? intval($parts[0]) : 0;
            $minutes = isset($parts[1]) ? intval($parts[1]) : 0;
            $hours = isset($parts[2]) ? intval($parts[2]) : 0;
        }

        // Build ISO 8601 string
        $iso = 'PT';
        if ($hours > 0)
            $iso .= $hours . 'H';
        if ($minutes > 0)
            $iso .= $minutes . 'M';
        if ($seconds > 0 || $iso === 'PT')
            $iso .= $seconds . 'S'; // Always include seconds

        return $iso;
    }
}

// h5vp_get_post_meta
if (!function_exists('h5vp__get_post_meta')) {
    function h5vp__get_post_meta($post_id, $key, $single = true)
    {
        $meta = get_post_meta($post_id, $key, $single);
        return function ($key, $default = null, $is_boolean = false) use ($meta) {
            if (isset($meta[$key])) {
                if ($is_boolean) {
                    return $meta[$key] === '1';
                }
                return $meta[$key];
            }
            return $default;
        };
    }
}


if (!function_exists('h5vp_getPostMeta')) {
    function h5vp_getPostMeta($id, $key)
    {
        $meta = get_post_meta($id, $key, true);
        return function ($key, $default = null, $is_boolean = false, $key2 = null) use ($meta) {
            if ($key === 'all') {
                return $meta;
            }
            if ($key2) {
                $value = isset($meta[$key][$key2]) ? $meta[$key][$key2] : $default;
            } else {
                $value = isset($meta[$key]) ? $meta[$key] : $default;
            }
            if ($is_boolean) {
                return $value == '1';
            }
            return $value;
        };
    }
}
