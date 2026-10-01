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

// Enqueue the HLS library only if some row is an .m3u8 stream.
$h5vp_all_sources = array();
foreach ($h5vp_videos as $h5vp_v) {
    if (!empty($h5vp_v['video_source'])) {
        $h5vp_all_sources[] = $h5vp_v['video_source'];
    }
    if (!empty($h5vp_v['h5vp_video_source'])) {
        $h5vp_all_sources[] = $h5vp_v['h5vp_video_source'];
    }
}
h5vp_maybe_enqueue_hls($h5vp_all_sources);

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
        data-nonce="<?php echo esc_attr(wp_create_nonce('wp_ajax')); ?>"></div>
</div>