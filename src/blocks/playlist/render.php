<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Filter the raw attributes, not the built payload — Pro's render.php hooks the
$h5vp_attributes = apply_filters('h5vp_playlist_block_attributes', $attributes);

if (empty($h5vp_attributes['videos']) || !is_array($h5vp_attributes['videos'])) {
    return;
}

// gives the video blocks.
$h5vp_videos = array();
foreach ($h5vp_attributes['videos'] as $h5vp_video) {
    if (!is_array($h5vp_video)) {
        continue;
    }

    // Attribute values come from post_content and can be any JSON shape
    // (hand-edited posts, imports); guard on is_scalar() rather than casting
    // blindly so a stray array/object doesn't warn or render as "Array".
    foreach (array('video_source', 'h5vp_video_source', 'video_thumb') as $h5vp_url_key) {
        if (!empty($h5vp_video[$h5vp_url_key]) && is_scalar($h5vp_video[$h5vp_url_key])) {
            $h5vp_video[$h5vp_url_key] = esc_url_raw((string) $h5vp_video[$h5vp_url_key]);
        } else {
            unset($h5vp_video[$h5vp_url_key]);
        }
    }

    foreach (array('video_title', 'video_desc', 'video_duration') as $h5vp_text_key) {
        if (!empty($h5vp_video[$h5vp_text_key]) && is_scalar($h5vp_video[$h5vp_text_key])) {
            $h5vp_video[$h5vp_text_key] = sanitize_text_field((string) $h5vp_video[$h5vp_text_key]);
        } else {
            unset($h5vp_video[$h5vp_text_key]);
        }
    }

    $h5vp_videos[] = $h5vp_video;
}

if (empty($h5vp_videos)) {
    return;
}

$h5vp_attributes['videos'] = $h5vp_videos;

$h5vp_unique_id = !empty($h5vp_attributes['uniqueId']) ? $h5vp_attributes['uniqueId'] : 'h5vp_playlist_' . wp_unique_id();

$h5vp_unique_id = sanitize_html_class($h5vp_unique_id, 'h5vp_playlist_' . wp_unique_id());


$h5vp_get_option = h5vp_get_option();
$h5vp_brand_color = !empty($h5vp_attributes['brandColor'])
    ? $h5vp_attributes['brandColor']
    : $h5vp_get_option('h5vp_player_primary_color', '#00b2ff');
$h5vp_brand_color = sanitize_hex_color($h5vp_brand_color);
if (empty($h5vp_brand_color)) {
    $h5vp_brand_color = '#00b2ff';
}

wp_enqueue_script('bplugins-plyrio');
wp_enqueue_style('bplugins-plyrio');

// hls.js is not enqueued here: MyPlayer loads it on demand, only when an HLS item is actually played.

$h5vp_default_controls = array(
    'play-large',
    'play',
    'progress',
    'current-time',
    'mute',
    'volume',
    'captions',
    'settings',
    'fullscreen'
);

$h5vp_data = array(
    'uniqueId' => $h5vp_unique_id,
    'playlistType' => isset($h5vp_attributes['playlistType']) ? $h5vp_attributes['playlistType'] : 'simplelist',
    'options' => array(
        'controls' => isset($h5vp_attributes['controls']) ? $h5vp_attributes['controls'] : $h5vp_default_controls,
        'muted' => false,
        'seekTime' => 10,
        'hideControls' => true,
        'resetOnEnd' => true,
        'autoplayNextVideo' => isset($h5vp_attributes['autoplayNextVideo']) ? (bool) $h5vp_attributes['autoplayNextVideo'] : true,
        'showPrevNext' => isset($h5vp_attributes['showPrevNext']) ? (bool) $h5vp_attributes['showPrevNext'] : false,
        'showSearch' => isset($h5vp_attributes['showSearch']) ? (bool) $h5vp_attributes['showSearch'] : false,
    ),
    'videos' => $h5vp_attributes['videos'],
    'styles' => array(
        'h5vp_playlist_container' => array(
            'width' => !empty($h5vp_attributes['playerWidth']) ? $h5vp_attributes['playerWidth'] : '100%',
            'max-width' => '100%',
        ),
    ),
);

// Thumbnail for the first item: shown by the static copy below, and by the app's click-to-load
// stand-in when that item is YouTube/Vimeo (Vimeo thumbnails need this server-side lookup).
$h5vp_first = $h5vp_videos[0];
$h5vp_first_is_library = ($h5vp_first['h5vp_video_provider'] ?? 'library') === 'library';
$h5vp_first_source = $h5vp_first_is_library ? ($h5vp_first['video_source'] ?? '') : ($h5vp_first['h5vp_video_source'] ?? '');
$h5vp_first_thumb = $h5vp_first['video_thumb'] ?? '';
if (!$h5vp_first_thumb && !$h5vp_first_is_library) {
    $h5vp_first_embed = h5vp_embed_provider($h5vp_first_source, $h5vp_first['h5vp_video_provider'] ?? '');
    $h5vp_first_thumb = $h5vp_first_embed ? h5vp_embed_thumbnail($h5vp_first_source, $h5vp_first_embed) : '';
    if ($h5vp_first_thumb) {
        h5vp_preconnect($h5vp_first_thumb);
    }
}
$h5vp_data['placeholderThumb'] = $h5vp_first_thumb;
?>

<div <?php echo wp_kses_data(get_block_wrapper_attributes()); ?>>
    <style>
        .h5vp_playlist.<?php echo esc_attr($h5vp_unique_id); ?>,
        .h5vp_playlist.<?php echo esc_attr($h5vp_unique_id); ?> .plyr {
            --h5vp-accent:
                <?php echo esc_attr($h5vp_brand_color); ?>
            ;
            --plyr-color-main:
                <?php echo esc_attr($h5vp_brand_color); ?>
            ;
        }
    </style>
    <div class="h5vp_playlist <?php echo esc_attr($h5vp_unique_id); ?>"
        data-attributes="<?php echo esc_attr(wp_json_encode($h5vp_data)); ?>"
        data-nonce="<?php echo esc_attr(wp_create_nonce('wp_ajax')); ?>"><?php
        // Static copy of what the playlist app renders (same classes, same box), so the page doesn't
        // shift when it mounts. Replaced on scroll-in, or when the placeholder is clicked.
        // Only a plain CSS length goes into the static copy's inline style.
        $h5vp_static_width = (string) $h5vp_data['styles']['h5vp_playlist_container']['width'];
        if (!preg_match('#^\d*\.?\d+(%|px|rem|em|vw|vh)?$#', trim($h5vp_static_width))) {
            $h5vp_static_width = '100%';
        }
        ?>
        <div id="<?php echo esc_attr($h5vp_unique_id); ?>" class="video video--bg simplelist">
            <div class="h5vp_playlist_container playlist_loaded" style="width:<?php echo esc_attr($h5vp_static_width); ?>;max-width:100%;">
                <div class="video__top video__wrapper plyr_wrapper skin-default" style="position:relative;">
                    <?php echo h5vp_player_placeholder(['poster' => $h5vp_first_thumb, 'options' => ['ratio' => '16:9']]); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside h5vp_player_placeholder() ?>
                </div>
                <ul class="video__top h5vp_playlist_items simplelist" aria-label="<?php echo esc_attr__('Playlist Videos', 'html5-video-player'); ?>">
                    <?php foreach ($h5vp_videos as $h5vp_index => $h5vp_item) { ?>
                        <li class="h5vp_playlist_item<?php echo 0 === $h5vp_index ? ' active' : ''; ?>">
                            <div class="svg play_pause_svg"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><polygon points="6,4 20,12 6,20" /></svg></div>
                            <div class="video_title"><span class="title"><?php echo esc_html(!empty($h5vp_item['video_title']) ? $h5vp_item['video_title'] : sprintf('Video %d', $h5vp_index + 1)); ?></span></div>
                            <?php if (!empty($h5vp_item['video_duration'])) { ?>
                                <span class="h5vp_playlist_badge h5vp_playlist_badge--duration"><?php echo esc_html($h5vp_item['video_duration']); ?></span>
                            <?php } ?>
                        </li>
                    <?php } ?>
                </ul>
            </div>
        </div>
    </div>
</div>