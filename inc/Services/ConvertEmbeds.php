<?php
/**
 * Optional Quick Player switch: show YouTube and Vimeo embeds in this player.
 *
 * With "Convert YouTube & Vimeo embeds" on (Quick Player settings), a YouTube or Vimeo link that WordPress
 * turns into an embed (the Embed block, a pasted URL in the classic editor, [embed]) is shown in the
 * player instead of the provider's iframe. Off by default, so existing sites are not touched.
 *
 * Single Embed blocks can decide for themselves (Advanced > Additional CSS class):
 * - "h5vp-keep-embed": stays the provider's own player, even with the switch on;
 * - "h5vp-convert-embed": shows this player, even with the switch off.
 *
 * @package H5VP
 */

namespace H5VP\Services;

if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}

class ConvertEmbeds
{
	/** Embed blocks with this CSS class keep the provider's own embed. */
	const KEEP_CLASS = 'h5vp-keep-embed';

	/** Embed blocks with this CSS class are converted even when the switch is off. */
	const CONVERT_CLASS = 'h5vp-convert-embed';

	/** Guards against converting the output of a conversion. */
	private static $busy = false;

	/** Addresses of the Embed blocks that carry the keep class. */
	private static $keep = array();

	/** Addresses of the Embed blocks that carry the convert class. */
	private static $force = array();

	public function register()
	{
		// WordPress turns embed links into iframes before the blocks are rendered, so the blocks are read first.
		add_filter('the_content', [$this, 'remember_in_content'], 7);
		add_filter('render_block_data', [$this, 'remember_block'], 10, 1);
		add_filter('embed_oembed_html', [$this, 'convert'], 99, 3);
	}

	/** Normal form of an address, to compare the one in a block with the one WordPress embeds. */
	private static function normalize($url)
	{
		return untrailingslashit(trim(wp_specialchars_decode((string) $url)));
	}

	/** Remember the address of an Embed block that has the keep or the convert class. */
	private static function remember_block_url($name, $attrs)
	{
		if ('core/embed' !== $name || !is_array($attrs) || empty($attrs['url']) || !is_string($attrs['url']) || empty($attrs['className']) || !is_string($attrs['className'])) {
			return;
		}
		$classes = preg_split('/\s+/', trim($attrs['className']));
		$url = self::normalize($attrs['url']);
		if (in_array(self::KEEP_CLASS, $classes, true)) {
			self::$keep[$url] = true;
		}
		if (in_array(self::CONVERT_CLASS, $classes, true)) {
			self::$force[$url] = true;
		}
	}

	/** @param array $block Parsed block (before it is rendered). */
	public function remember_block($block)
	{
		if (is_array($block) && isset($block['blockName'])) {
			self::remember_block_url($block['blockName'], isset($block['attrs']) ? $block['attrs'] : array());
		}
		return $block;
	}

	/** @param string $content Post content before embeds and blocks are processed. */
	public function remember_in_content($content)
	{
		// Only content that mentions the class is read.
		if (is_string($content) && (false !== strpos($content, self::KEEP_CLASS) || false !== strpos($content, self::CONVERT_CLASS)) && preg_match_all('/<!--\s+wp:embed\s+(\{.*?\})\s+\/?-->/s', $content, $matches)) {
			foreach ($matches[1] as $json) {
				$attrs = json_decode($json, true);
				self::remember_block_url('core/embed', $attrs);
			}
		}
		return $content;
	}

	/** Whether the "Convert YouTube & Vimeo embeds" switch is on. */
	public static function is_enabled()
	{
		$quick = h5vp_get_option('h5vp_quick');

		return is_callable($quick) ? '1' === (string) $quick('h5vp_convert_embeds_quick', '0') : false;
	}

	/**
	 * Replace a YouTube/Vimeo embed with the player.
	 *
	 * @param string|false $html Embed HTML.
	 * @param string       $url  The URL that was embedded.
	 * @param array        $attr Embed attributes.
	 * @return string|false
	 */
	public function convert($html, $url, $attr = array())
	{
		if (self::$busy || !$html || !is_string($url) || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) {
			return $html;
		}
		if (is_admin() && !wp_doing_ajax()) {
			return $html;
		}
		$wanted = isset(self::$force[self::normalize($url)]);
		if (!$wanted && !self::is_enabled()) {
			return $html;
		}

		$provider = h5vp_embed_provider($url);
		if ('youtube' !== $provider && 'vimeo' !== $provider) {
			return $html;
		}

		// An Embed block with the keep class stays the provider's own embed.
		if (isset(self::$keep[self::normalize($url)])) {
			return $html;
		}

		// The URL goes into a shortcode, so only a plain http(s) address is accepted.
		$url = esc_url_raw($url, array('http', 'https'));
		if ('' === $url || !preg_match('#^https?://[^\s"\'\[\]<>]+$#', $url)) {
			return $html;
		}

		self::$busy = true;
		$player = do_shortcode('[video_player src="' . $url . '" source="' . $provider . '"]');
		self::$busy = false;

		// Anything that did not render a player keeps the original embed.
		return (is_string($player) && false !== strpos($player, 'html5_video_players')) ? $player : $html;
	}
}
