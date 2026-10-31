/**
 * Client-side mirror of the PHP player sanitizers in inc/functions.php
 * (h5vp_sanitize_player_url / h5vp_sanitize_player_controls / h5vp_sanitize_player_options).
 *
 * Block attributes come straight from post_content in the block editor, without going through the
 * server render, so the same rules have to apply here before anything reaches Plyr or the DOM.
 * Keep the lists in sync with the PHP functions.
 */

export const KNOWN_CONTROLS = ['play-large', 'restart', 'rewind', 'play', 'fast-forward', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'download', 'fullscreen'];

export const DEFAULT_CONTROLS = ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'airplay', 'fullscreen'];

const KNOWN_SETTINGS = ['captions', 'quality', 'speed', 'loop'];

const ALLOWED_OPTION_KEYS = [
  'controls', 'settings', 'loadSprite', 'autoplay', 'autopause', 'playsinline', 'seekTime', 'volume', 'muted',
  'hideControls', 'resetOnEnd', 'clickToPlay', 'disableContextMenu', 'invertTime', 'toggleInvert', 'displayDuration',
  'duration', 'tooltips', 'captions', 'ratio', 'storage', 'speed', 'loop', 'ads', 'urls', 'markers', 'preload',
  'quality', 'fullscreen', 'keyboard', 'imported', 'autoplayNextVideo', 'showPrevNext', 'showSearch',
];

/** Schemes a clickable link (end screen button, overlay) may use besides http(s). */
export const LINK_PROTOCOLS = ['http', 'https', 'mailto', 'tel'];

/** Return the URL unchanged when it is relative or uses an allowed scheme (http(s) by default); '' otherwise. */
export function safeUrl(url: unknown, protocols: string[] = ['http', 'https']): string {
  if (typeof url !== 'string' && typeof url !== 'number') {
    return '';
  }
  const value = String(url);
  // Read the scheme the way a browser does: entities decoded, whitespace/control characters ignored.
  const decoded = value.replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&colon;?/gi, ':')
    .replace(/[\u0000- \u007f]+/g, '');
  const scheme = decoded.match(/^([a-z][a-z0-9+.\-]*):/i);
  if (scheme && !protocols.includes(scheme[1].toLowerCase())) {
    return '';
  }
  return value;
}

/** Plain text only: no tags, no angle brackets. */
export function plainText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(/<[^<>]*>/g, '').replace(/[<>]/g, '');
}

/** Keep only known Plyr control names; anything that is not a list falls back to the defaults. */
export function sanitizeControls(controls: unknown, fallback: string[] = DEFAULT_CONTROLS): string[] {
  if (!Array.isArray(controls)) {
    return [...fallback];
  }
  return controls.filter((control) => typeof control === 'string' && KNOWN_CONTROLS.includes(control));
}

function sanitizeTree(value: any, depth = 0): any {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    return typeof value === 'string' ? plainText(value) : value;
  }
  if (typeof value !== 'object' || depth > 4) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeTree(item, depth + 1));
  }
  const clean: Record<string, any> = {};
  Object.keys(value).forEach((key) => {
    clean[key] = sanitizeTree(value[key], depth + 1);
  });
  return clean;
}

/** Rebuild the Plyr `options` attribute from known keys (same rules as h5vp_sanitize_player_options()). */
export function sanitizePlayerOptions(options: unknown): Record<string, any> {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    return {};
  }
  const raw = options as Record<string, any>;
  const clean: Record<string, any> = {};

  Object.keys(raw).forEach((key) => {
    if (!ALLOWED_OPTION_KEYS.includes(key)) {
      return;
    }
    const value = raw[key];

    switch (key) {
      case 'controls':
        clean[key] = sanitizeControls(value);
        break;

      case 'settings':
        clean[key] = Array.isArray(value) ? value.filter((s) => typeof s === 'string' && KNOWN_SETTINGS.includes(s)) : [...KNOWN_SETTINGS];
        break;

      case 'urls': {
        // Only the download link is configurable; provider sdk/iframe/api URLs always come from Plyr's defaults.
        const urls: Record<string, any> = {};
        if (value && typeof value === 'object') {
          Object.keys(value).forEach((urlKey) => {
            if (urlKey === 'enabled') {
              urls[urlKey] = sanitizeTree(value[urlKey]);
            } else if (urlKey === 'download') {
              const download = safeUrl(value[urlKey]);
              if (value[urlKey] === null) {
                urls[urlKey] = null;
              } else if (download !== '' || value[urlKey] === '') {
                urls[urlKey] = download;
              }
            }
          });
        }
        clean[key] = urls;
        break;
      }

      case 'ads': {
        const ads: Record<string, any> = {};
        if (value && typeof value === 'object') {
          Object.keys(value).forEach((adsKey) => {
            if (adsKey === 'tagUrl') {
              const tagUrl = safeUrl(value[adsKey]);
              ads[adsKey] = tagUrl !== '' || value[adsKey] === '' ? tagUrl : null;
            } else {
              ads[adsKey] = sanitizeTree(value[adsKey]);
            }
          });
        }
        clean[key] = ads;
        break;
      }

      case 'markers': {
        const markers: Record<string, any> = {};
        if (value && typeof value === 'object') {
          Object.keys(value).forEach((markerKey) => {
            if (markerKey !== 'points') {
              markers[markerKey] = sanitizeTree(value[markerKey]);
              return;
            }
            // Plyr writes marker labels as HTML: plain text only.
            const points = Array.isArray(value.points) ? value.points : Object.values(value.points || {});
            markers.points = points
              .filter((point: any) => point && typeof point === 'object' && !Array.isArray(point))
              .map((point: any) => {
                const cleanPoint: Record<string, any> = {};
                Object.keys(point).forEach((field) => {
                  if (point[field] === null || typeof point[field] !== 'object') {
                    cleanPoint[field] = plainText(point[field]);
                  }
                });
                return cleanPoint;
              });
          });
        }
        clean[key] = markers;
        break;
      }

      case 'speed': {
        const speed: Record<string, any> = {};
        if (value && typeof value === 'object') {
          Object.keys(value).forEach((speedKey) => {
            if (speedKey === 'options') {
              if (Array.isArray(value.options)) {
                speed.options = value.options.filter((v: any) => (typeof v === 'number' || typeof v === 'string') && v !== '' && !isNaN(Number(v)));
              }
            } else {
              speed[speedKey] = sanitizeTree(value[speedKey]);
            }
          });
        }
        clean[key] = speed;
        break;
      }

      default:
        clean[key] = sanitizeTree(value);
    }
  });

  return clean;
}
