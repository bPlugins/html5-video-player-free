// Defers mounting a player until it is about to scroll into view, so players further down the page
// don't download media (or run their scripts) on page load.

const pending = new Map<Element, () => void>();
let observer: IntersectionObserver | null = null;

/** Run `mount` once `el` comes within ~300px of the viewport (immediately if the browser can't tell). */
export const whenNearViewport = (el: Element, mount: () => void): void => {
  if (typeof window.IntersectionObserver !== "function") {
    mount();
    return;
  }

  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const run = pending.get(entry.target);
          observer?.unobserve(entry.target);
          pending.delete(entry.target);
          run?.();
        });
      },
      { rootMargin: "300px 0px" }
    );
  }

  pending.set(el, mount);
  observer.observe(el);
};

/**
 * Start playback in a player that has already mounted. A click on the server placeholder can arrive
 * after the player mounted on scroll-in — delay-JS plugins (WP Rocket) hold clicks back and replay
 * them once every script has run — and it would otherwise land on a placeholder that's gone.
 */
export const playMounted = (el: Element, tries = 30): void => {
  const media = el.querySelector<HTMLMediaElement>("video, audio");
  if (media) {
    media.play()?.catch(() => {});
    return;
  }
  // A YouTube/Vimeo item still showing its click-to-load stand-in.
  const standIn = el.querySelector<HTMLElement>(".h5vp-placeholder");
  if (standIn) {
    standIn.click();
    return;
  }
  // React may not have committed the player yet.
  if (tries > 0) requestAnimationFrame(() => playMounted(el, tries - 1));
};
