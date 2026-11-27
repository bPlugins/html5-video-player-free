<?php
/**
 * Video library: sort players into categories and show a category on a page.
 *
 * - A "Video Categories" taxonomy on the players (Html5 Video Player > Video Categories). The category shows
 *   as a column in the players list, and bulk edit can assign it to many players at once.
 * - [html5_video_library category="my-category" layout="grid" columns="3"] and the "Video Library" block show
 *   the players of a category as a grid or a list. Every card is the player itself, so each video keeps its own
 *   settings.
 *
 * @package H5VP
 */

namespace H5VP\Services;

if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}

class VideoLibrary
{
	const TAXONOMY = 'h5vp_video_cat';

	const POST_TYPE = 'videoplayer';

	public function register()
	{
		add_action('init', [$this, 'register_taxonomy'], 11);
		add_action('init', [$this, 'register_block'], 20);
		add_action('admin_menu', [$this, 'badge_menu_entry'], 99);
		add_shortcode('html5_video_library', [$this, 'shortcode']);
	}

	/** Put a "New" label on the Video Categories menu entry (WordPress escapes a taxonomy's menu label, so it is added here). */
	public function badge_menu_entry()
	{
		global $submenu;
		$parent = 'edit.php?post_type=' . self::POST_TYPE;
		if (empty($submenu[$parent]) || !is_array($submenu[$parent])) {
			return;
		}
		foreach ($submenu[$parent] as $index => $item) {
			if (isset($item[2]) && false !== strpos((string) $item[2], 'taxonomy=' . self::TAXONOMY)) {
				// phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- adding a label to our own menu entry.
				$submenu[$parent][$index][0] = '<span style="white-space:nowrap;">' . $item[0] . str_replace(array('margin-left:6px', 'padding:1px 6px', 'letter-spacing:.5px'), array('margin-left:3px', 'padding:1px 4px', 'letter-spacing:.2px'), h5vp_new_badge()) . '</span>';
			}
		}
	}

	public function register_taxonomy()
	{
		register_taxonomy(
			self::TAXONOMY,
			self::POST_TYPE,
			array(
				'labels' => array(
					'name' => __('Video Categories', 'html5-video-player'),
					'singular_name' => __('Video Category', 'html5-video-player'),
					'search_items' => __('Search Categories', 'html5-video-player'),
					'all_items' => __('All Categories', 'html5-video-player'),
					'edit_item' => __('Edit Category', 'html5-video-player'),
					'update_item' => __('Update Category', 'html5-video-player'),
					'add_new_item' => __('Add New Category', 'html5-video-player'),
					'new_item_name' => __('New Category Name', 'html5-video-player'),
					'menu_name' => __('Video Categories', 'html5-video-player'),
					'not_found' => __('No categories found.', 'html5-video-player'),
				),
				'hierarchical' => true,
				'public' => false,
				'show_ui' => true,
				'show_in_menu' => true,
				'show_admin_column' => true,
				'show_in_quick_edit' => true,
				'show_in_rest' => true,
				'rewrite' => false,
				'query_var' => false,
			)
		);
	}

	/** A category given as a slug, a name or an id. */
	private static function find_term($category)
	{
		$category = trim((string) $category);
		if ('' === $category) {
			return null;
		}
		$term = ctype_digit($category) ? get_term((int) $category, self::TAXONOMY) : get_term_by('slug', sanitize_title($category), self::TAXONOMY);
		if (!$term || is_wp_error($term)) {
			$term = get_term_by('name', $category, self::TAXONOMY);
		}

		return ($term && !is_wp_error($term)) ? $term : null;
	}

	/**
	 * The players of a category that visitors may see.
	 *
	 * @param \WP_Term $term     Category.
	 * @param int      $limit    How many players.
	 * @param string   $orderby  date | title | menu_order | rand.
	 * @param string   $order    ASC | DESC.
	 * @return int[] Player ids.
	 */
	public static function player_ids($term, $limit = 12, $orderby = 'date', $order = 'DESC')
	{
		$orderby = in_array($orderby, array('date', 'title', 'menu_order', 'rand'), true) ? $orderby : 'date';
		$order = 'ASC' === strtoupper((string) $order) ? 'ASC' : 'DESC';

		$query = new \WP_Query(
			array(
				'post_type' => self::POST_TYPE,
				'post_status' => 'publish',
				'has_password' => false,
				'posts_per_page' => max(1, min(60, (int) $limit)),
				'orderby' => $orderby,
				'order' => $order,
				'fields' => 'ids',
				'no_found_rows' => true,
				'ignore_sticky_posts' => true,
				'tax_query' => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- one taxonomy on a small post type, needed to list a category.
					array(
						'taxonomy' => self::TAXONOMY,
						'field' => 'term_id',
						'terms' => array((int) $term->term_id),
					),
				),
			)
		);

		return array_map('intval', $query->posts);
	}

	/**
	 * Output for the shortcode and the block.
	 *
	 * @param array $atts category, layout (grid|list), columns (1-6), limit, orderby, order, show_title (1|0).
	 * @return string
	 */
	public function render($atts)
	{
		$atts = wp_parse_args(
			(array) $atts,
			array(
				'category' => '',
				'layout' => 'grid',
				'columns' => 3,
				'limit' => 12,
				'orderby' => 'date',
				'order' => 'DESC',
				'show_title' => 1,
			)
		);

		$term = self::find_term($atts['category']);
		if (!$term) {
			return current_user_can('edit_posts')
				? '<p class="h5vp-library-empty">' . esc_html__('Video Library: choose a video category.', 'html5-video-player') . '</p>'
				: '';
		}

		$ids = self::player_ids($term, (int) $atts['limit'], (string) $atts['orderby'], (string) $atts['order']);
		if (empty($ids)) {
			return current_user_can('edit_posts')
				? '<p class="h5vp-library-empty">' . esc_html__('This video category has no videos yet.', 'html5-video-player') . '</p>'
				: '';
		}

		$layout = (string) $atts['layout'];

		/**
		 * Let another layout (the playlist layout of the Pro version) render the category.
		 *
		 * @param string   $html  Output; empty to use the grid/list.
		 * @param int[]    $ids   Player ids.
		 * @param \WP_Term $term  Category.
		 * @param array    $atts  Attributes.
		 */
		$custom = apply_filters('h5vp_library_layout', '', $ids, $term, $atts);
		if (is_string($custom) && '' !== $custom) {
			return $custom;
		}

		$columns = max(1, min(6, (int) $atts['columns']));
		$columns = 'list' === $layout ? 1 : $columns;
		$show_title = !empty($atts['show_title']) && '0' !== (string) $atts['show_title'];

		wp_enqueue_style('h5vp-library');

		$html = '<div class="h5vp-library h5vp-library--' . esc_attr('list' === $layout ? 'list' : 'grid') . '" style="--h5vp-library-cols:' . (int) $columns . '">';
		foreach ($ids as $id) {
			$player = do_shortcode('[html5_video id=' . (int) $id . ']');
			if (!is_string($player) || '' === trim($player)) {
				continue;
			}
			$html .= '<div class="h5vp-library__item">' . $player;
			if ($show_title) {
				$title = get_the_title($id);
				if ('' !== $title) {
					$html .= '<h4 class="h5vp-library__title">' . esc_html($title) . '</h4>';
				}
			}
			$html .= '</div>';
		}
		$html .= '</div>';

		return $html;
	}

	public function shortcode($atts)
	{
		return $this->render(shortcode_atts(
			array(
				'category' => '',
				'layout' => 'grid',
				'columns' => 3,
				'limit' => 12,
				'orderby' => 'date',
				'order' => 'DESC',
				'show_title' => 1,
			),
			$atts,
			'html5_video_library'
		));
	}

	/** The "Video Library" block: server-rendered, its settings are generated from block.json. */
	public function register_block()
	{
		// The grid styles: also the block's own style handle, so the editor preview is laid out as well.
		wp_register_style('h5vp-library', false, array(), '1.0.0');
		wp_add_inline_style(
			'h5vp-library',
			'.h5vp-library{display:grid;grid-template-columns:repeat(var(--h5vp-library-cols,3),minmax(0,1fr));gap:24px}'
			. '.h5vp-library__item{min-width:0}.h5vp-library__title{margin:10px 0 0;font-size:1rem;line-height:1.35}'
			. '@media(max-width:782px){.h5vp-library{grid-template-columns:repeat(min(var(--h5vp-library-cols,3),2),minmax(0,1fr))}}'
			. '@media(max-width:480px){.h5vp-library{grid-template-columns:minmax(0,1fr)}}'
		);

		$dir = dirname(__DIR__) . '/blocks/video-library';
		if (!is_readable($dir . '/block.json')) {
			return;
		}
		register_block_type(
			$dir,
			array(
				'render_callback' => function ($attributes) {
					return $this->render(array(
						'category' => $attributes['category'] ?? '',
						'layout' => $attributes['layout'] ?? 'grid',
						'columns' => $attributes['columns'] ?? 3,
						'limit' => $attributes['limit'] ?? 12,
						'orderby' => $attributes['orderby'] ?? 'date',
						'order' => $attributes['order'] ?? 'DESC',
						'show_title' => ($attributes['titles'] ?? true) ? 1 : 0,
					));
				},
			)
		);
	}
}
