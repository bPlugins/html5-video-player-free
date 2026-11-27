// A <video> whose file can't be loaded (not found, blocked, an http link on an https page, an unsupported format
// such as an iPhone .mov) otherwise leaves a black box with no explanation. This shows a short message on the player.
// Site editors (anyone who sees the admin bar) get the likely cause; visitors get a neutral line.

const DEFAULT_TEXT = {
  visitor: "This video can't be played right now.",
  admin: "This video can't be played.",
  notFound: "The file was not found, is blocked, or is in a format this browser can't play.",
  mixed: "The video link starts with http:// but this page is https://, so the browser blocked it. Use an https:// link.",
  format: "This file format (for example .mov or HEVC) is not supported by most browsers. Convert it to MP4 (H.264).",
  network: "The connection was lost while the video was loading.",
  decode: "The video file is damaged or uses a codec this browser can't play.",
};

type Text = typeof DEFAULT_TEXT;

const UNSUPPORTED_EXTENSIONS = ["mov", "mkv", "avi", "wmv", "flv", "hevc", "h265"];

const getText = (): Text => ({ ...DEFAULT_TEXT, ...((window as any).h5vpBlock?.mediaError || {}) });

const describe = (text: Text, code: number, src: string): string => {
  if (window.location.protocol === "https:" && /^http:\/\//i.test(src)) return text.mixed;
  const extension = src.split(/[?#]/)[0].split(".").pop()?.toLowerCase() || "";
  if (UNSUPPORTED_EXTENSIONS.includes(extension)) return text.format;
  if (code === 2) return text.network;
  if (code === 3) return text.decode;
  return text.notFound;
};

/**
 * Shows a message inside `host` when `media` fails to load, and removes it again if the video starts loading
 * after all. Returns a function that stops watching. `isStopped` lets the owner say the player was torn down,
 * because destroying a player also makes the browser report an error on its emptied <video>.
 */
export const watchMediaError = (
  host: HTMLElement | null | undefined,
  media: HTMLMediaElement | null | undefined,
  isStopped: () => boolean = () => false
): (() => void) => {
  if (!host || !media) return () => {};

  let overlay: HTMLElement | null = null;

  const hide = () => {
    overlay?.remove();
    overlay = null;
  };

  const show = (code: number, src: string) => {
    if (isStopped() || !media.isConnected || overlay) return;
    const text = getText();
    const isEditor = document.body.classList.contains("admin-bar");

    overlay = document.createElement("div");
    overlay.className = "h5vp-media-error";
    overlay.setAttribute("role", "status");
    overlay.style.cssText =
      "position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:6px;padding:16px 16px 56px;box-sizing:border-box;text-align:center;pointer-events:none;color:#fff;" +
      "background:rgba(0,0,0,.92);font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";

    const title = document.createElement("strong");
    title.style.cssText = "font-size:15px;font-weight:600;";
    title.textContent = isEditor ? text.admin : text.visitor;
    overlay.appendChild(title);

    if (isEditor) {
      const detail = document.createElement("span");
      detail.style.cssText = "max-width:520px;opacity:.85;";
      detail.textContent = describe(text, code, src);
      overlay.appendChild(detail);
    }
    host.appendChild(overlay);
  };

  // `confirmed` means a source has just failed or enough time has passed; NETWORK_NO_SOURCE alone is also the
  // brief state while the browser is still picking a <source>, so it only counts then.
  const check = (confirmed: boolean) => {
    if (isStopped()) return;
    const error = media.error;
    // MEDIA_ERR_ABORTED (1) is the viewer or the page stopping the load, not a failure.
    if (error && error.code !== 1) {
      show(error.code, media.currentSrc || media.getAttribute("src") || "");
      return;
    }
    // When every <source> fails the browser sets no error on the <video> itself, only NETWORK_NO_SOURCE.
    if (confirmed && !error && media.networkState === media.NETWORK_NO_SOURCE) {
      const sources = media.querySelectorAll("source");
      if (sources.length) show(4, sources[sources.length - 1].getAttribute("src") || "");
    }
  };

  // A <source> only reports once its candidate has failed; the last one failing means nothing is left to try.
  const onSourceError = (event: Event) => {
    const target = event.target as Element | null;
    if (target instanceof HTMLSourceElement && target.parentNode === media && !target.nextElementSibling) check(true);
  };
  const onMediaError = () => check(true);

  // Plyr moves the <video> while it builds its wrapper, and an event fired meanwhile never reaches the page
  // (the element is detached), so the listeners go on the elements themselves, not only on the wrapper.
  const bound = new WeakSet<Element>();
  const bindSources = () => {
    media.querySelectorAll("source").forEach((source) => {
      if (bound.has(source)) return;
      bound.add(source);
      source.addEventListener("error", onSourceError);
    });
  };
  media.addEventListener("error", onMediaError);
  bindSources();

  // Media events don't bubble, so a listener on the player wrapper uses the capture phase (this also covers
  // <source> elements added later, for example by the quality switcher).
  const recovered = () => hide();
  host.addEventListener("error", onSourceError, true);
  host.addEventListener("loadstart", recovered, true);
  host.addEventListener("loadedmetadata", recovered, true);
  host.addEventListener("canplay", recovered, true);

  // The failure may have happened before this ran, or its event may have been lost: look again a few times.
  check(false);
  const timers = [1500, 4000, 9000].map((delay) =>
    window.setTimeout(() => {
      bindSources();
      check(true);
    }, delay)
  );

  return () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    media.removeEventListener("error", onMediaError);
    media.querySelectorAll("source").forEach((source) => source.removeEventListener("error", onSourceError));
    host.removeEventListener("error", onSourceError, true);
    host.removeEventListener("loadstart", recovered, true);
    host.removeEventListener("loadedmetadata", recovered, true);
    host.removeEventListener("canplay", recovered, true);
    hide();
  };
};
