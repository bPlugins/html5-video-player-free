import { useLayoutEffect, useMemo, useRef } from 'react';
import camelToKebabCase from '../../../utils/camelToKebabCase';
import { StylesMap } from '../../../interfaces/MyPlayerInterface';

// ────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────

interface StyleProps {
  styles?: StylesMap;
  uniqueId: string;
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

const Style = ({ styles = {}, uniqueId }: StyleProps) => {
  const ref = useRef<HTMLStyleElement>(null);
  // A leading digit (or "-digit") is invalid in a CSS id selector (older players have ids like "480c07f8"), so escape it as a hex code point.
  const safeUniqueId = useMemo(
    () =>
      (uniqueId || '')
        .replace(/[^A-Za-z0-9_-]/g, '')
        .replace(/^(-?)(\d)/, (_, dash, digit) => `${dash}\\3${digit} `),
    [uniqueId]
  );

  const rules = useMemo(() => {
    const result: string[] = [];

    if (typeof styles === 'object') {
      for (const key of Object.keys(styles)) {
        const value = styles[key];
        if (typeof value !== 'object') continue;

        const declarations = Object.entries(value)
          .map(([prop, val]) => `${camelToKebabCase(prop)}: ${val};`)
          .join(' ');

        const prefix = ['.', '#'].includes(key[0]) ? '' : '.';
        result.push(`#${safeUniqueId} ${prefix}${key}{${declarations}}`);
      }
    }

    result.push(`#${safeUniqueId} {--plyr-color-main: ${window.h5vpBlock?.brandColor}}`);
    return result;
  }, [styles, safeUniqueId]);

  // Layout effect, not a plain effect: the rules (width, radius…) must be in place before the first
  // paint of the mounted player, or a narrower/aligned player flashes at full width for a frame (CLS).
  useLayoutEffect(() => {
    const sheet = ref.current?.sheet;
    if (!sheet) return;

    while (sheet.cssRules.length) sheet.deleteRule(0);
    rules.forEach((rule) => {
      try {
        sheet.insertRule(rule, sheet.cssRules.length);
      } catch {
        // Malformed rule — drop it rather than let it break the rest of the sheet.
      }
    });
  }, [rules]);

  return <style ref={ref} />;
};

export default Style;
