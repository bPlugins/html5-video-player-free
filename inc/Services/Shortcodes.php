<?php

namespace H5VP\Services;

if (!defined('ABSPATH'))
  exit; // Exit if accessed directly

use H5VP\Helper\Block;


class Shortcodes
{

  public function __construct()
  {
    add_shortcode('video_player', [$this, 'video_player'], 10, 2);
    add_shortcode('html5_video', [$this, 'html5_video'], 10, 2);
  }

  public function html5_video($atts)
  {
    $atts = (array) $atts;
    $id = isset($atts['id']) ? absint($atts['id']) : 0;

    $post = $id ? get_post($id) : null;

    if (!$post || 'videoplayer' !== $post->post_type) {
      return '';
    }

    $isGutenberg = get_post_meta($id, 'isGutenberg', true);

    if (post_password_required($post)) {
      return get_the_password_form($post);
    }
    switch ($post->post_status) {
      case 'publish':
        return $this->video_player_shortcode_content($post, $isGutenberg);
      case 'private':
        if (current_user_can('read_private_posts')) {
          return $this->video_player_shortcode_content($post, $isGutenberg);
        }
        return '';
      case 'draft':
      case 'pending':
      case 'future':
        if (current_user_can('edit_post', $post->ID)) {
          return $this->video_player_shortcode_content($post, $isGutenberg);
        }
        return '';
      default:
        return '';
    }
  }

  public function video_player_shortcode_content($post, $isGutenberg)
  {
    if ($isGutenberg) {
      $blocks = parse_blocks($post->post_content);
      if (isset($blocks[0])) {
        return render_block($blocks[0]);
      }
      return null;
    }
    $block = Block::getInstance()->classic_to_gutenberg_block($post->ID);
    return (string) render_block($block);
  }

  public function video_player($atts)
  {
    $attrs = shortcode_atts($this->video_player_attrs(), $atts);


    if ($attrs['file'] == null && $attrs['src'] == null && $attrs['mp4'] == null) {
      return "No Video Added";
    } else {
      return render_block(Block::getInstance()->video_player_to_gutenberg_block($attrs));
    }
  }


  public function video_player_attrs()
  {
    return array(
      'file' => null,
      'source' => 'library',
      'poster' => '',
      'mp4' => null,
      'src' => null,
      'autoplay' => false,
      'reset_on_end' => false,
      'repeat' => false,
      'muted' => false,
      'width' => null,
      'preload' => null,
      'default_volume' => null,
      'ratio' => null,
      'aspect_ratio' => null,
      'fit' => null,
      'ios_native' => 'true',
      'playsinline' => null,
      'controls' => null,
      'hide_controls' => null,
      'align' => null,
      // Subtitle attributes. shortcode_atts() drops anything not declared here,
      // so Block::video_player_to_gutenberg_block() never saw these without them.
      'caption' => null,
      'caption_label' => null,
      'subtitle' => null,
      'subtitle_label' => null
    );
  }


}
