<?php
/**
 * Field descriptions as a "?" tooltip.
 *
 * In the player settings (the "Configure Your Video Player" box and Quick Player) the lines under a field title
 * and under a field become a "?" icon on the right of the row; hovering it shows what the field does. Only how
 * the settings are shown changes, never a field id or a saved value. A text that has a link stays under the
 * field, so the link can still be clicked.
 *
 * @package H5VP
 */

namespace H5VP\Services;

if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}

class FieldHelp
{
	/**
	 * Settings screens this applies to (Codestar unique ids).
	 */
	const SCREENS = ['_h5vp_', 'h5vp_quick'];

	/**
	 * Field types that only show something and have no value to explain.
	 */
	const PLAIN_TYPES = ['content', 'notice', 'heading', 'subheading', 'submessage', 'callback', 'fieldset', 'group', 'accordion', 'tabbed', 'repeater'];

	public function register()
	{
		foreach (self::SCREENS as $screen) {
			add_filter('csf_' . $screen . '_sections', [$this, 'sections'], 30);
		}
	}

	/**
	 * @param array $sections Codestar sections.
	 * @return array
	 */
	public function sections($sections)
	{
		if (!is_array($sections)) {
			return $sections;
		}
		foreach ($sections as $i => $section) {
			if (is_array($section) && !empty($section['fields']) && is_array($section['fields'])) {
				$sections[$i]['fields'] = array_map([$this, 'field'], $section['fields']);
			}
		}
		return $sections;
	}

	/**
	 * @param mixed $field A Codestar field.
	 * @return mixed
	 */
	public function field($field)
	{
		if (!is_array($field) || empty($field['id'])) {
			return $field;
		}
		$type = isset($field['type']) ? $field['type'] : '';
		if (in_array($type, self::PLAIN_TYPES, true)) {
			return $field;
		}

		$parts = [];
		foreach (['help', 'subtitle', 'desc'] as $key) {
			if (isset($field[$key]) && $this->movable($field[$key])) {
				$parts[] = trim($field[$key]);
			}
		}
		if (!$parts) {
			return $field;
		}

		// A key that holds a link stays where it is; the others move into the tooltip.
		foreach (['subtitle', 'desc'] as $key) {
			if (isset($field[$key]) && $this->movable($field[$key])) {
				unset($field[$key]);
			}
		}
		$field['help'] = implode(' ', $parts);
		return $field;
	}

	/**
	 * @param mixed $text A description.
	 * @return bool True for a plain text that is safe to show in the tooltip.
	 */
	private function movable($text)
	{
		return is_string($text) && '' !== trim($text) && false === stripos($text, '<a');
	}
}
