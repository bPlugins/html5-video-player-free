<?php
/**
 * Elementor widget: Video Library. It shows the players of a video category as a grid or a list, the same as
 * the [html5_video_library] shortcode and the "Video Library" block.
 *
 * @package H5VP
 */

namespace H5VP\Elementor;

use Elementor\Controls_Manager;
use Elementor\Widget_Base;

if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}

class VideoLibrary extends Widget_Base
{
	public function get_name()
	{
		return 'H5VPVideoLibrary';
	}

	public function get_title()
	{
		return __('HTML5 Video Library', 'html5-video-player');
	}

	public function get_icon()
	{
		return 'eicon-gallery-grid';
	}

	public function get_categories()
	{
		return ['basic'];
	}

	public function get_keywords()
	{
		return ['video', 'library', 'category', 'playlist', 'html5'];
	}

	protected function register_controls()
	{
		$this->start_controls_section(
			'library',
			[
				'label' => esc_html__('Video Library', 'html5-video-player'),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$categories = ['' => esc_html__('All categories', 'html5-video-player')];
		$terms = get_terms(['taxonomy' => 'h5vp_video_cat', 'hide_empty' => false]);
		if (!is_wp_error($terms)) {
			foreach ($terms as $term) {
				$categories[$term->slug] = $term->name;
			}
		}

		$this->add_control(
			'category',
			[
				'label' => esc_html__('Video category', 'html5-video-player'),
				'description' => esc_html__('Sort players into categories in Html5 Video Player > Video Categories.', 'html5-video-player'),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => $categories,
			]
		);

		$layouts = [
			'grid' => esc_html__('Grid', 'html5-video-player'),
			'list' => esc_html__('List', 'html5-video-player'),
		];
		// "Playlist" is part of the Pro version.
		if (function_exists('h5vp_can_use_premium_code') && h5vp_can_use_premium_code()) {
			$layouts['playlist'] = esc_html__('Playlist (one player, the list beside it)', 'html5-video-player');
		}
		$this->add_control(
			'layout',
			[
				'label' => esc_html__('Layout', 'html5-video-player'),
				'type' => Controls_Manager::SELECT,
				'default' => 'grid',
				'options' => $layouts,
			]
		);

		$this->add_control(
			'columns',
			[
				'label' => esc_html__('Columns', 'html5-video-player'),
				'type' => Controls_Manager::NUMBER,
				'min' => 1,
				'max' => 6,
				'step' => 1,
				'default' => 3,
				'condition' => ['layout' => 'grid'],
			]
		);

		$this->add_control(
			'limit',
			[
				'label' => esc_html__('How many videos', 'html5-video-player'),
				'type' => Controls_Manager::NUMBER,
				'min' => 1,
				'max' => 50,
				'step' => 1,
				'default' => 12,
			]
		);

		$this->add_control(
			'orderby',
			[
				'label' => esc_html__('Order by', 'html5-video-player'),
				'type' => Controls_Manager::SELECT,
				'default' => 'date',
				'options' => [
					'date' => esc_html__('Date', 'html5-video-player'),
					'title' => esc_html__('Title', 'html5-video-player'),
					'rand' => esc_html__('Random', 'html5-video-player'),
				],
			]
		);

		$this->add_control(
			'order',
			[
				'label' => esc_html__('Order', 'html5-video-player'),
				'type' => Controls_Manager::SELECT,
				'default' => 'DESC',
				'options' => [
					'DESC' => esc_html__('Newest first', 'html5-video-player'),
					'ASC' => esc_html__('Oldest first', 'html5-video-player'),
				],
				'condition' => ['orderby!' => 'rand'],
			]
		);

		$this->add_control(
			'show_title',
			[
				'label' => esc_html__('Show titles', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => esc_html__('Yes', 'html5-video-player'),
				'label_off' => esc_html__('No', 'html5-video-player'),
				'return_value' => '1',
				'default' => '1',
			]
		);

		$this->end_controls_section();
	}

	protected function render()
	{
		$s = $this->get_settings_for_display();

		$layout = isset($s['layout']) ? $s['layout'] : 'grid';
		if (!in_array($layout, ['grid', 'list', 'playlist'], true)) {
			$layout = 'grid';
		}
		$orderby = isset($s['orderby']) && in_array($s['orderby'], ['date', 'title', 'rand'], true) ? $s['orderby'] : 'date';

		// Same attributes as the shortcode, so the library renders (and is protected) in one place.
		echo do_shortcode(sprintf(
			'[html5_video_library category="%s" layout="%s" columns="%d" limit="%d" orderby="%s" order="%s" show_title="%d"]',
			esc_attr(isset($s['category']) ? sanitize_title($s['category']) : ''),
			esc_attr($layout),
			isset($s['columns']) ? max(1, min(6, (int) $s['columns'])) : 3,
			isset($s['limit']) ? max(1, min(50, (int) $s['limit'])) : 12,
			esc_attr($orderby),
			isset($s['order']) && 'ASC' === $s['order'] ? 'ASC' : 'DESC',
			!empty($s['show_title']) ? 1 : 0
		)); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- output of our own shortcode, already escaped there.
	}
}
