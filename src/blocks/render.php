<?php
if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

if (!isset($attributes['source']) || empty($attributes['source'])) {
    return;
}
$attributes = h5vp_process_block_attributes($attributes);

$attributes = apply_filters('h5vp_block_attributes', $attributes);

// hls.js is not enqueued here: MyPlayer loads it on demand, only once an HLS player actually mounts.

$h5vp_embed = h5vp_embed_provider($attributes['source'] ?? '', $attributes['provider'] ?? '');
$h5vp_thumbnail = $h5vp_embed ? h5vp_embed_thumbnail($attributes['source'], $h5vp_embed) : '';
if ($h5vp_thumbnail && empty($attributes['poster'])) {
    h5vp_preconnect($h5vp_thumbnail);
}
$h5vp_reserved = h5vp_reserved_space(
    $attributes['options']['ratio'] ?? null,
    $attributes['styles']['plyr_wrapper']['width'] ?? ''
);
$h5vp_brand_color = sanitize_hex_color(h5vp_get_option()('h5vp_player_primary_color', '#00b2ff')) ?: '#00b2ff';

$h5vp_wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'wp-block-html5-player-video html5_video_players ' . $h5vp_reserved['class'],
    'style' => $h5vp_reserved['style'] . '--plyr-color-main:' . $h5vp_brand_color . ';',
]);
?>

<div data-video-id="<?php echo esc_attr($attributes['video_id'] ?? ''); ?>" <?php echo wp_kses_data($h5vp_wrapper_attributes); ?> data-attributes="<?php echo esc_attr(wp_json_encode($attributes)) ?>"><?php
    // Replaced by the real player when it mounts (on scroll-in, or on click for YouTube/Vimeo).
    echo h5vp_player_placeholder($attributes, $h5vp_thumbnail); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside h5vp_player_placeholder()
?></div>
