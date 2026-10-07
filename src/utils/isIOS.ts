/**
 * iPhone / iPad. Every browser there runs on WebKit with the same media rules, so this covers
 * Safari, Chrome and the rest. iPadOS 13+ reports a desktop Mac user agent; touch support tells it apart.
 */
export const isIOS = (): boolean =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export default isIOS;
