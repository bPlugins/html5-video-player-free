// Players are mounted once, when the page first loads. Content that arrives later - infinite scroll, "load more",
// popups, tabs and page builders that render on demand - would be left as an empty box. This watches the page for
// new markup and runs the same (idempotent) init again.

const w = window as any;

/**
 * Runs `scan` again whenever markup matching `selector` is added to the page, and chains it onto
 * `window.h5vpInit()` so a theme or plugin that injects players itself can ask for a rescan.
 */
export const rescanOnDomChange = (scan: () => void, selector: string): void => {
  const run = () => {
    try {
      scan();
    } catch (err) {
      console.error("HTML5 Video Player: could not set up a player.", err);
    }
  };

  const previous = w.h5vpInit;
  w.h5vpInit = () => {
    if (typeof previous === "function") previous();
    run();
  };

  if (typeof MutationObserver !== "function") return;

  let timer = 0;
  const observer = new MutationObserver((records) => {
    if (timer) return;
    for (const record of records) {
      for (const node of Array.from(record.addedNodes)) {
        if (node.nodeType !== 1) continue;
        const el = node as Element;
        // Nodes a mounted player adds to itself (menus, captions) can never contain a new player.
        if (el.closest("[data-h5vp-mounted]")) continue;
        if (el.matches(selector) || el.querySelector(selector)) {
          timer = window.setTimeout(() => {
            timer = 0;
            run();
          }, 50);
          return;
        }
      }
    }
  });
  // Not while the page is still being parsed: a player seen before its placeholder arrives would mount at once
  // instead of lazily. The first init already runs at DOMContentLoaded.
  const start = () => observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
};
