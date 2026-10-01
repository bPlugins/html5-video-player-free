<?php
if (!defined('ABSPATH'))
	exit; // Exit if accessed directly
use H5VP\Elementor\VideoPlayer;
use H5VP\Elementor\H5VPSelectFile;

if (!class_exists('H5VP_Free_Elementor_Addons', false)) {

final class H5VP_Free_Elementor_Addons
{
	const VERSION = '1.0.0';
	const MINIMUM_ELEMENTOR_VERSION = '2.0.0';
	const MINIMUM_PHP_VERSION = '7.0';

	private static $_instance = null;

	public static function instance()
	{
		if (is_null(self::$_instance)) {
			self::$_instance = new self();
		}
		return self::$_instance;
	}

	public function __construct()
	{
		add_action("elementor/frontend/after_register_scripts", [$this, 'frontend_assets_scripts']);
		add_action('elementor/widgets/register', [$this, 'init_widgets']);
		add_action('elementor/controls/register', [$this, 'init_controls']);
	}

	public function init_controls($controls_manager)
	{
		require_once(__DIR__ . '/inc/elementor-custom-control/b-select-file.php');

		// throw a duplicate-control notice.
		if (!class_exists(H5VPSelectFile::class) || $controls_manager->get_control('h5vp-select-file')) {
			return;
		}

		$controls_manager->register(new H5VPSelectFile());
	}

	public function frontend_assets_scripts()
	{
		wp_register_script('bplugins-plyrio', plugin_dir_url(__FILE__) . 'public/js/plyr-v3.8.4.polyfilled.js', array('jquery'), '3.8.4', false);
		wp_register_script('bplugins-hls', plugin_dir_url(__FILE__) . 'public/js/hls.min.js', array(), '1.7.0', false);

		wp_register_style('bplugins-plyrio', plugin_dir_url(__FILE__) . 'public/css/h5vp.css', array(), H5VP_VER, 'all');

	}

	public function init_widgets()
	{
		if (file_exists(__DIR__ . '/inc/Elementor/VideoPlayer.php')) {
			require_once(__DIR__ . '/inc/Elementor/VideoPlayer.php');
		}

		\Elementor\Plugin::instance()->widgets_manager->register(new VideoPlayer());
	}
}

H5VP_Free_Elementor_Addons::instance();

}