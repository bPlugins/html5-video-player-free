// eslint-disable-next-line no-unused-vars
import { version } from "react-dom"; // don't remove it, to add react-dom as dependency on view.asset.php, this line is crucial

import VideoPlayer from "./Components/Common/VideoPlayer";
import isYoutubeURL from "../../../wp-utils/v1/isYoutubeURL";
import isVimeoLink from "../utils/isVimeoLink";
import { watchReservedSpace } from "../public/reservedSpace";
import { playMounted, whenNearViewport } from "../utils/lazyMount";
import { isIOS } from "../utils/isIOS";
import { rescanOnDomChange } from "../utils/domWatch";
import { pauseWhenHidden } from "../utils/pauseWhenHidden";

const PLAYER_SELECTOR = '[class^="wp-block-html5-player-"]';

/** How long a player waits for React to finish loading (a script optimizer can reorder scripts) before giving up. */
const REACT_WAIT_MS = 200;
const REACT_WAIT_TRIES = 25;

/** Same provider detection as useVideoSource: YouTube/Vimeo embeds vs self-hosted media. */
const isEmbed = (attributes: any): boolean => {
  const { provider, source } = attributes || {};
  if (provider === "youtube" || provider === "vimeo") return true;
  if (provider && provider !== "library") return false;
  return !!isYoutubeURL(source) || !!isVimeoLink(source);
};

/** Players this script has set up itself. A copy made by a popup/modal plugin carries the same data-h5vp-* attributes but is not in here. */
const live = new WeakSet<Element>();
const waiting = new WeakSet<Element>();

type Payload = { attributes: string; nonce: string };

/** Markup copied from a player keeps its data-h5vp-* flags (and, if it was already running, dead rendered children). */
const dropCopiedState = (el: HTMLElement) => {
  if (live.has(el) || waiting.has(el)) return;
  delete el.dataset.h5vpMounted;
  delete el.dataset.h5vpPending;
};

/** The player's settings: from the server markup, or from the copy kept in data-h5vp-restore once it has mounted (a copy of a running player has only that). */
const readPayload = (el: HTMLElement): Payload | null => {
  if (el.dataset.attributes) {
    return { attributes: el.dataset.attributes, nonce: el.dataset.nonce || "" };
  }
  if (el.dataset.h5vpRestore) {
    try {
      const saved = JSON.parse(el.dataset.h5vpRestore);
      if (saved && typeof saved.attributes === "string") {
        return { attributes: saved.attributes, nonce: typeof saved.nonce === "string" ? saved.nonce : "" };
      }
    } catch {
      /* fall through */
    }
  }
  return null;
};

const mount = (el: HTMLElement, startPlaying = false, tries = 0) => {
  dropCopiedState(el);
  if (live.has(el)) return;
  const payload = readPayload(el);
  if (!payload) return;

  // React is a separate script; if it has not run yet, try again shortly instead of failing for good.
  const createRoot = (window as any).ReactDOM?.createRoot;
  if (!createRoot) {
    if (tries < REACT_WAIT_TRIES) window.setTimeout(() => mount(el, startPlaying, tries + 1), REACT_WAIT_MS);
    return;
  }

  // Parse before marking the player as mounted, so a bad payload can't leave it half set up.
  const attributes = JSON.parse(payload.attributes);
  live.add(el);
  waiting.delete(el);
  el.dataset.h5vpMounted = "1";
  el.dataset.h5vpRestore = JSON.stringify(payload);
  // The visitor already pressed play on the placeholder — start as soon as the player is up.
  if (startPlaying) {
    if (isEmbed(attributes)) {
      // Not Plyr's autoplay: that becomes autoplay=1 in the embed URL, which iOS plays muted (Vimeo) or refuses (YouTube).
      attributes.playOnReady = true;
    } else {
      attributes.options = { ...attributes.options, autoplay: true };
    }
  }
  const nonce = payload.nonce || undefined;
  createRoot(el).render(<VideoPlayer attributes={attributes} nonce={nonce} />);

  el.removeAttribute("data-attributes");
  el.removeAttribute("data-nonce");

  // Hand sizing back to the player once it can size itself (see render.php).
  watchReservedSpace(el);
  pauseWhenHidden(el);
};

/**
 * Self-hosted players mount as they near the viewport; YouTube/Vimeo stay a thumbnail until clicked,
 * because their embeds download ~1MB of third-party script. Autoplay players mount right away.
 */
const setup = (el: HTMLElement) => {
  dropCopiedState(el);
  if (live.has(el) || waiting.has(el)) return;
  const payload = readPayload(el);
  if (!payload) return;

  let attributes: any;
  try {
    attributes = JSON.parse(payload.attributes);
  } catch {
    return;
  }

  const placeholder = el.querySelector<HTMLElement>(".h5vp-placeholder");
  // No placeholder means markup rendered before this version (e.g. an old cached page): mount as before.
  if (!placeholder || attributes?.options?.autoplay) {
    mount(el);
    return;
  }

  waiting.add(el);
  el.dataset.h5vpPending = "1";
  const playNow = (event?: Event) => {
    event?.preventDefault();
    if (live.has(el)) {
      playMounted(el);
      return;
    }
    mount(el, true);
  };
  placeholder.addEventListener("click", playNow, { once: true });
  placeholder.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") playNow(event);
  });

  // iPhone/iPad: an embed built after the tap can't use that tap any more — YouTube refuses to start and
  // Vimeo starts muted. There YouTube/Vimeo load as they near the screen, so the visitor's tap reaches a
  // ready player (see MyPlayer::letIosTapReachYouTube for YouTube).
  if (isEmbed(attributes) && !isIOS()) {
    // A placeholder that can't be seen can't be clicked either (e.g. markup filtered down to nothing): fall back to mounting.
    if (placeholder.offsetHeight === 0 && el.offsetParent !== null) mount(el);
    return;
  }

  whenNearViewport(el, () => mount(el));
};

const init = () => {
  document.querySelectorAll<HTMLElement>(PLAYER_SELECTOR).forEach((el) => {
    // One broken player must not stop the players after it from being set up.
    try {
      setup(el);
    } catch (err) {
      console.error("HTML5 Video Player: could not set up a player.", err);
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Players that arrive after the page has loaded (infinite scroll, AJAX, popups, tabs) get set up too.
rescanOnDomChange(init, PLAYER_SELECTOR);

window.addEventListener("elementor/frontend/init", function () {
  const elementorFrontend = (window as any).elementorFrontend;
  elementorFrontend.hooks.addAction("frontend/element_ready/H5VPPlayer.default", function (scope: any) {
    const block = scope?.[0]?.querySelector(".html5_video_players") as HTMLElement | null;
    if (!block) return;

    // The editor preview should show the real player straight away.
    if (elementorFrontend.isEditMode?.()) {
      mount(block);
    } else {
      setup(block);
    }
  });
});
