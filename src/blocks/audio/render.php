<?php
if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

if (empty($attributes['source'])) {
    return;
}

// Work on a prefixed copy so the core-provided $attributes is never reassigned.
$h5vp_attributes = apply_filters('h5vp_audio_block_attributes', $attributes);

// Attributes come from post_content and can be any JSON shape (hand-edited
// posts, imports). Guard on is_scalar() rather than casting blindly, so a
// stray array/object doesn't emit a PHP warning or render as the literal
// string "Array".
if (!is_scalar($h5vp_attributes['source'])) {
    return;
}
$h5vp_attributes['source'] = esc_url_raw((string) $h5vp_attributes['source']);

if (empty($h5vp_attributes['source'])) {
    return;
}

if (!empty($h5vp_attributes['artwork']) && is_scalar($h5vp_attributes['artwork'])) {
    $h5vp_attributes['artwork'] = esc_url_raw((string) $h5vp_attributes['artwork']);
} else {
    $h5vp_attributes['artwork'] = '';
}

foreach (array('title', 'artist', 'width', 'borderRadius', 'backgroundColor', 'primaryColor', 'textColor', 'skin', 'preload') as $h5vp_text_key) {
    if (isset($h5vp_attributes[$h5vp_text_key]) && is_scalar($h5vp_attributes[$h5vp_text_key])) {
        $h5vp_attributes[$h5vp_text_key] = sanitize_text_field((string) $h5vp_attributes[$h5vp_text_key]);
    } else {
        unset($h5vp_attributes[$h5vp_text_key]);
    }
}

$h5vp_wrapper_attributes = get_block_wrapper_attributes();
?>

<div <?php echo wp_kses_data($h5vp_wrapper_attributes); ?>>
    <?php // The skin class lets the stylesheet hold the player's height until the script mounts it (no layout shift). ?>
    <div class="h5vp_audio_player h5vp-audio-skin-<?php echo esc_attr(sanitize_html_class($h5vp_attributes['skin'] ?? 'default', 'default')); ?>" data-attributes="<?php echo esc_attr(wp_json_encode($h5vp_attributes)); ?>"></div>
</div>