<?php

namespace H5VP\Elementor;



use Elementor\Widget_Base;
use Elementor\Controls_Manager;

if (!defined('ABSPATH'))
	exit; // Exit if accessed directly

if (class_exists(__NAMESPACE__ . '\VideoPlayer')) {
	return;
}

/**
 * Elementor Hello World
 *
 * Elementor widget for hello world.
 *
 * @since 1.0.0
 */
class VideoPlayer extends Widget_Base
{

	/**
	 * Retrieve the widget name.
	 *
	 * @since 1.0.0
	 *
	 * @access public
	 *
	 * @return string Widget name.
	 */
	public function get_name()
	{
		return 'H5VPPlayer';
	}

	/**
	 * Retrieve the widget title.
	 *
	 * @since 1.0.0
	 *
	 * @access public
	 *
	 * @return string Widget title.
	 */
	public function get_title()
	{
		return __('HTML5 Video Player', 'html5-video-player');
	}

	/**
	 * Retrieve the widget icon.
	 *
	 * @since 1.0.0
	 *
	 * @access public
	 *
	 * @return string Widget icon.
	 */
	public function get_icon()
	{
		return 'eicon-video-camera';
	}

	/**
	 * Retrieve the list of categories the widget belongs to.
	 *
	 * Used to determine where to display the widget in the editor.
	 *
	 * Note that currently Elementor supports only one category.
	 * When multiple categories passed, Elementor uses the first one.
	 *
	 * @since 1.0.0
	 *
	 * @access public
	 *
	 * @return array Widget categories.
	 */
	public function get_categories()
	{
		return ['basic'];
	}

	/**
	 * Retrieve the list of scripts the widget depended on.
	 *
	 * Used to set scripts dependencies required to run the widget.
	 *
	 * @since 1.0.0
	 *
	 * @access public
	 *
	 * @return array Widget scripts dependencies.
	 */
	public function get_script_depends()
	{
		return ['h5vp-view'];
	}

	/**
	 * Style
	 */
	public function get_style_depends()
	{
		return ['h5vp-view'];
	}


	/**
	 * Register the widget controls.
	 *
	 * Adds different input fields to allow the user to change and customize the widget settings.
	 *
	 * @since 1.0.0
	 *
	 * @access protected
	 */
	protected function register_controls()
	{
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__('Settings', 'html5-video-player'),
				'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'video_source',
			[
				'label' => __('Video Source', 'html5-video-player'),
				'type' => \Elementor\Controls_Manager::SELECT,
				'default' => 'library',
				'options' => [
					'library' => __('Library or CDN Source', 'html5-video-player'),
					// 'youtube'  => __('Youtube', 'html5-video-player'),
					// 'vimeo'  => __('Vimeo', 'html5-video-player'),
				],
				'desc' => __("Select video source", "html5-video-player"),
			]
		);

		$this->add_control(
			'source',
			[
				'label' => esc_html__('Select Video', 'html5-video-player'),
				'type' => 'h5vp-select-file',
				'separator' => 'before',
				'placeholder' => esc_html__("Paste Video or HLS (.m3u8) URL", "html5-video-player"),
				'description' => esc_html__("Select a video file or paste an MP4, WebM, or HLS (.m3u8) stream URL.", "html5-video-player"),
				'condition' => array(
					'video_source' => 'library'
				)
			]
		);

		$this->add_control(
			'source_youtube_vimeo',
			[
				'label' => esc_html__('video id or url', 'html5-video-player'),
				'type' => Controls_Manager::TEXT,
				'separator' => 'before',
				'default' => '',
				'label_block' => true,
				'condition' => [
					'video_source' => ['youtube', 'vimeo']
				]
			]
		);

		$this->add_control(
			'poster',
			[
				'label' => esc_html__('Select Poster', 'html5-video-player'),
				'type' => 'h5vp-select-file',
				'separator' => 'before',
				'placeholder' => esc_html__("Paste Poster URL", "html5-video-player"),
			]
		);

		$this->add_control(
			'width',
			[
				'label' => __('Width', 'html5-video-player'),
				'type' => Controls_Manager::SLIDER,
				'size_units' => ['px', '%'],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 1000,
						'step' => 5,
					],
					'%' => [
						'min' => 0,
						'max' => 100,
					],
				],
				'default' => [
					'unit' => '%',
					'size' => 100,
				],
				'separator' => 'before'
			]
		);

		$this->add_control(
			'align',
			[
				'label' => __('Alignment', 'html5-video-player'),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'left' => [
						'title' => __('Left', 'html5-video-player'),
						'icon' => 'eicon-text-align-left',
					],
					'center' => [
						'title' => __('Center', 'html5-video-player'),
						'icon' => 'eicon-text-align-center',
					],
					'right' => [
						'title' => __('Right', 'html5-video-player'),
						'icon' => 'eicon-text-align-right',
					],
				],
				// Empty by default: widgets placed before this control existed
				// keep rendering without an alignment class. Only has a visible
				// effect once Width is below 100%.
				'default' => '',
				'toggle' => true,
				'separator' => 'before',
			]
		);

		$this->add_control(
			'autoplay',
			[
				'label' => __('Autoplay', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __('Yes', 'html5-video-player'),
				'label_off' => __('No', 'html5-video-player'),
				'return_value' => '1',
				'default' => '',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'muted',
			[
				'label' => __('Muted', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __('Yes', 'html5-video-player'),
				'label_off' => __('No', 'html5-video-player'),
				'return_value' => '1',
				'default' => '',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'repeat',
			[
				'label' => __('Repeat', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __('Yes', 'html5-video-player'),
				'label_off' => __('No', 'html5-video-player'),
				'return_value' => '1',
				'default' => '',
				'separator' => 'before',
			]
		);


		$this->add_control(
			'reset_on_end',
			[
				'label' => __('Reset On End', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __('Yes', 'html5-video-player'),
				'label_off' => __('No', 'html5-video-player'),
				'return_value' => '1',
				'default' => '1',
				'separator' => 'before',
				'condition' => array(
					'video_source' => 'library'
				)
			]
		);

		$this->add_control(
			'auto_hide_control',
			[
				'label' => __('Auto Hide Control', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __('Yes', 'html5-video-player'),
				'label_off' => __('No', 'html5-video-player'),
				'return_value' => '1',
				'default' => '1',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'playsinline',
			[
				'label' => __('Allow Inline Playback on iOS', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __('Yes', 'html5-video-player'),
				'label_off' => __('No', 'html5-video-player'),
				'return_value' => '1',
				'default' => '1',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'preload',
			[
				'label' => __('Preload', 'html5-video-player'),
				'type' => Controls_Manager::SELECT,
				'default' => 'metadata',
				'options' => [
					'auto' => __('Auto - Browser should load the entire file when the page loads.', 'html5-video-player'),
					'metadata' => __('Metadata - Browser should load only meatadata when the page loads.', 'html5-video-player'),
					'none' => __('None - Browser should NOT load the file when the page loads.', 'html5-video-player'),
				],
				'separator' => 'before',
				// preload is a <video> attribute, so it has no effect on the
				// YouTube/Vimeo iframe embeds.
				'condition' => array(
					'video_source' => 'library'
				)
			]
		);
		$this->end_controls_section();

		$this->start_controls_section(
			'section_subtitles',
			[
				'label' => esc_html__('Subtitle / Caption', 'html5-video-player'),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'caption_label',
			[
				'label' => esc_html__('Language Label & Code', 'html5-video-player'),
				'type' => Controls_Manager::TEXT,
				'default' => 'English/en',
				'placeholder' => 'English/en',
				'description' => esc_html__('Format: Label/code (e.g. English/en)', 'html5-video-player'),
			]
		);

		$this->add_control(
			'caption_file',
			[
				'label' => esc_html__('Caption File (.vtt)', 'html5-video-player'),
				'type' => 'h5vp-select-file',
				'placeholder' => esc_html__('Paste .vtt URL or upload', 'html5-video-player'),
				'description' => esc_html__('Upload a .vtt subtitle file or paste an external .vtt link.', 'html5-video-player'),
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'controls',
			[
				'label' => esc_html__('Controls', 'html5-video-player'),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'play-large',
			[
				'label' => __('Large Play', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'play-large',
				'separator' => 'before',
				'default' => 'play-large'
			]
		);

		$this->add_control(
			'restart',
			[
				'label' => __('Restart', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'restart',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'rewind',
			[
				'label' => __('Rewind', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'rewind',
				// 'default' => 'rewind',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'play',
			[
				'label' => __('Play', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'play',
				'default' => 'play',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'fast-forward',
			[
				'label' => __('Fast Forward', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'fast-forward',
				// 'default' => 'fast-forward',
				'separator' => 'before',
			]
		);


		$this->add_control(
			'progress',
			[
				'label' => __('Progressbar', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'progress',
				'default' => 'progress',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'current-time',
			[
				'label' => __('Current Time', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'current-time',
				'default' => 'current-time',
				'separator' => 'before',
			]
		);
		$this->add_control(
			'duration',
			[
				'label' => __('Duration', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'duration',
				// 'default' => 'duration',
				'separator' => 'before',
			]
		);
		$this->add_control(
			'mute',
			[
				'label' => __('Mute', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'mute',
				'default' => 'mute',
				'separator' => 'before',
			]
		);
		$this->add_control(
			'volume',
			[
				'label' => __('Volume', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'volume',
				'default' => 'volume',
				'separator' => 'before',
			]
		);
		$this->add_control(
			'captions',
			[
				'label' => __('Captions', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'captions',
				'default' => 'captions',
				'separator' => 'before',
			]
		);
		$this->add_control(
			'settings',
			[
				'label' => __('Settings', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'settings',
				'default' => 'settings',
				'separator' => 'before',
			]
		);


		$this->add_control(
			'pip',
			[
				'label' => __('PIP', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'pip',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'airplay',
			[
				'label' => __('Air Play', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'ariplay',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'fullscreen',
			[
				'label' => __('Full Screen', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'fullscreen',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'download',
			[
				'label' => __('Downlaod', 'html5-video-player'),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'download',
				'separator' => 'before',
				'condition' => array(
					'video_source' => 'library'
				)
			]
		);

		$this->end_controls_section();
	}

	/**
	 * Render the widget output on the frontend.
	 *
	 * Written in PHP and used to generate the final HTML.
	 *
	 * @since 1.0.0
	 *
	 * @access protected
	 */
	protected function render()
	{
		$s = $this->get_settings_for_display();

		$provider = $s['video_source'];
		$classes = 'h5vp_player';

		$options = [];
		$video = [];
		$video_source = $s['source'];
		if ($provider === 'youtube' || $provider === 'vimeo') {
			$video_source = $s['source_youtube_vimeo'];
		}

		$video_poster = $s['poster'];

		$controls = [
			'play-large' => $s['play-large'] === 'play-large' ? 'show' : 'hide',
			'restart' => $s['restart'] === 'restart' ? 'show' : 'hide',
			'rewind' => $s['rewind'] === 'rewind' ? 'show' : 'hide',
			'play' => $s['play'] === 'play' ? 'show' : 'hide',
			'fast-forward' => $s['fast-forward'] === 'fast-forward' ? 'show' : 'hide',
			'progress' => $s['progress'] === 'progress' ? 'show' : 'hide',
			'current-time' => $s['current-time'] === 'current-time' ? 'show' : 'hide',
			'duration' => $s['duration'] === 'duration' ? 'show' : 'hide',
			'mute' => $s['mute'] === 'mute' ? 'show' : 'hide',
			'volume' => $s['volume'] === 'volume' ? 'show' : 'hide',
			'captions' => (isset($s['captions']) ? ($s['captions'] === 'captions' ? 'show' : 'hide') : 'show'),
			'settings' => $s['settings'] === 'settings' ? 'show' : 'hide',
			'pip' => $s['pip'] === 'pip' ? 'show' : 'hide',
			'airplay' => $s['airplay'] === 'airplay' ? 'show' : 'hide',
			'download' => $s['download'] === 'download' ? 'show' : 'hide',
			'fullscreen' => $s['fullscreen'] === 'fullscreen' ? 'show' : 'hide',
		];

		$final_controls = [];
		foreach ($controls as $key => $value) {
			if ($value === 'show') {
				array_push($final_controls, $key);
			}
		}

		$options = [
			'controls' => $final_controls,
			'tooltips' => [
				'controls' => true,
				'seek' => true,
			],
			'loop' => [
				'active' => (bool) $s['repeat'],
			],
			'autoplay' => (bool) $s['autoplay'],
			'muted' => (bool) $s['muted'],
			'hideControls' => (bool) $s['auto_hide_control'],
			'resetOnEnd' => (bool) $s['reset_on_end'],
			// Widgets saved before the control existed have no key; keep the
			// plugin-wide default (true) rather than dropping to false.
			'playsinline' => self::i($s, 'playsinline', '', '1') === '1',
			'preload' => self::i($s, 'preload', '', 'metadata'),
			'markers' => ['enabled' => false],
			'spped' => [],
			'urls' => ['enabled' => false],
			'storage' => [
				'enabled' => true,
			],
			'ratio' => '16/9',
		];

		$width = '100%';
		if (isset($s['width']['size'], $s['width']['unit']) && '' !== $s['width']['size']) {
			$width = $s['width']['size'] . $s['width']['unit'];
		}

		$subtitles = [];
		$caption_file = $s['caption_file'] ?? '';
		if (is_array($caption_file) && !empty($caption_file['url'])) {
			$caption_file = $caption_file['url'];
		}
		if (!empty($caption_file)) {
			$caption_label = !empty($s['caption_label']) ? $s['caption_label'] : 'English/en';
			$subtitles[] = [
				'label' => (string) $caption_label,
				'caption_file' => esc_url_raw((string) $caption_file),
			];
		}

		$options = [
			'options' => $options,
			'uniqueId' => wp_unique_id('h5vp_elementor_'),
			'source' => $video_source,
			'poster' => $video_poster,
			'subtitle' => $subtitles,
			'styles' => [
				'plyr_wrapper' => [
					'width' => $width
				]
			],
		];

		// Widgets saved before the control existed have no key, so this resolves
		// to '' and no alignment class is emitted. Core's alignment support keys
		// off array_key_exists(), so the key is only set once it has a value.
		$align = h5vp_sanitize_align(self::i($s, 'align', '', ''));
		if ('' !== $align) {
			$options['align'] = $align;
		}

		$block = [
			'blockName' => "html5-player/video",
			'attrs' => $options,

			"innerBlocks" => [],
			"innerHTML" => "",
			"innerContent" => [],
		];
		if (is_admin()) {
			// Elementor renders the editor preview over admin-ajax, where
			// render_block() is not available, so the block wrapper is mirrored
			// by hand: the same classes the alignment CSS hangs off, plus the
			// `data-attributes` payload that view.js reads in its
			// `frontend/element_ready/H5VPPlayer.default` handler to mount the
			// real player. Emitting a bare <video> here instead left the preview
			// a black box with no controls.
			$preview_class = 'wp-block-html5-player-video html5_video_players' . ('' !== $align ? ' align' . $align : '');

			// Same guard render.php applies: mounting the player against an
			// empty source just yields a broken Plyr instance.
			if (empty($video_source)) {
				?>
				<div class="<?php echo esc_attr($preview_class) ?>">
					<div class="plyr_wrapper" style="width: <?php echo esc_attr($width) ?>; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; border: 1px dashed #c3c4c7; color: #787c82; font-size: 13px; text-align: center;">
						<?php echo esc_html__('Select a video to preview the player.', 'html5-video-player'); ?>
					</div>
				</div>
				<?php
				return;
			}

			$preview_attributes = apply_filters('h5vp_block_attributes', h5vp_process_block_attributes($options));
			?>
			<div class="<?php echo esc_attr($preview_class) ?>"
				data-video-id="<?php echo esc_attr($preview_attributes['video_id'] ?? ''); ?>"
				data-attributes="<?php echo esc_attr(wp_json_encode($preview_attributes)) ?>"></div>
			<?php
		} else {
			echo wp_kses_post(render_block($block));
		}

	}

	public static function i($array, $key1, $key2 = '', $default = false)
	{
		if (isset($array[$key1][$key2])) {
			return $array[$key1][$key2];
		} else if (isset($array[$key1])) {
			return $array[$key1];
		}
		return $default;
	}
}
