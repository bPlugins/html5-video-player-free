// A popup/modal that is closed only hides its content (display: none); a video inside kept playing, audio included.
// Pause the media in a player as soon as it has no size, i.e. is hidden.

const watched = new WeakSet<Element>();

// YouTube and Vimeo run inside an iframe, out of reach of the <video> lookup above, and a player's instance isn't
// exposed on the page. Plyr marks its play button aria-pressed while playing, and a click on it pauses any provider.
const pausePlyr = (el: Element): void => {
  // Two buttons (the control bar's and the large overlay one) drive the same player; one click per player, or they cancel out.
  el.querySelectorAll<HTMLElement>(".plyr").forEach((player) => {
    // A <video>/<audio> player was already paused directly; its button still reads "pressed" for a moment, so a click would restart it.
    if (player.querySelector("video, audio")) return;
    player.querySelector<HTMLElement>('[data-plyr="play"][aria-pressed="true"]')?.click();
  });
};

const pauseEmbeds = (el: Element): void => {
  el.querySelectorAll<HTMLIFrameElement>("iframe").forEach((frame) => {
    const src = frame.src || "";
    try {
      if (src.includes("youtube")) {
        frame.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
      } else if (src.includes("vimeo")) {
        frame.contentWindow?.postMessage(JSON.stringify({ method: "pause" }), "*");
      }
    } catch (e) {
      /* a cross-origin frame that is not ready yet */
    }
  });
};

export const pauseWhenHidden = (el: HTMLElement): void => {
  if (watched.has(el) || typeof ResizeObserver !== "function") return;
  watched.add(el);

  const observer = new ResizeObserver(() => {
    if (!el.isConnected) {
      observer.disconnect();
      return;
    }
    const box = el.getBoundingClientRect();
    if (box.width !== 0 || box.height !== 0) return;
    el.querySelectorAll<HTMLMediaElement>("video, audio").forEach((media) => {
      if (!media.paused) media.pause();
    });
    pausePlyr(el);
    pauseEmbeds(el);
  });
  observer.observe(el);
};
