/** Sanitise a value before it is interpolated into a <style> element. */
export function cssValue(value: unknown): string {
	if (value === null || value === undefined || typeof value === 'object') {
		return '';
	}

	return String(value)
		.replace(/\/\*|\*\//g, '') // comment markers
		.replace(/[<>{};@\\]/g, '') // element/rule/declaration terminators, at-rules, escapes
		.trim();
}

/** Sanitise a selector fragment (the keys of a styles map). */
export function cssSelector(key: unknown): string {
	if (typeof key !== 'string') {
		return '';
	}

	return key.replace(/[^A-Za-z0-9_\-.#>\[\]="':\s]/g, '').trim();
}

/** Sanitise an element id and escape it so it is valid after `#` (ids may start with a digit, e.g. "480c07f8"). */
export function cssId(id: unknown): string {
	if (typeof id !== 'string' || id === '') {
		return '';
	}

	const safe = id.replace(/[^A-Za-z0-9_-]/g, '');
	// A leading digit (or "-digit") is invalid in a CSS identifier; escape it as a hex code point.
	return safe.replace(/^(-?)(\d)/, (_, dash, digit) => `${dash}\\3${digit} `);
}

export default cssValue;

