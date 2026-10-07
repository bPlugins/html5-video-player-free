// eslint-disable-next-line no-unused-vars
import { version } from "react-dom"; // don't remove it, to add react-dom as dependency on view.asset.php, this line is crucial

import VideoPlayer from "./Components/Common/VideoPlayer";
import isYoutubeURL from "../../../wp-utils/v1/isYoutubeURL";
import isVimeoLink from "../utils/isVimeoLink";
import { watchReservedSpace } from "../public/reservedSpace";
import { playMounted, whenNearViewport } from "../utils/lazyMount";
import { isIOS } from "../utils/isIOS";

//@ts-ignore
const { createRoot } = window.ReactDOM;

/** Same provider detection as useVideoSource: YouTube/Vimeo embeds vs self-hosted media. */
const isEmbed = (attributes: any): boolean => {
  const { provider, source } = attributes || {};
  if (provider === "youtube" || provider === "vimeo") return true;
  if (provider && provider !== "library") return false;
  return !!isYoutubeURL(source) || !!isVimeoLink(source);
};

const mount = (el: HTMLElement, startPlaying = false) => {
  if (el.dataset.h5vpMounted || !el.dataset.attributes) return;
  el.dataset.h5vpMounted = "1";

  const attributes = JSON.parse(el.dataset.attributes);
  // The visitor already pressed play on the placeholder — start as soon as the player is up.
  if (startPlaying) {
    if (isEmbed(attributes)) {
      // Not Plyr's autoplay: that becomes autoplay=1 in the embed URL, which iOS plays muted (Vimeo) or refuses (YouTube).
      attributes.playOnReady = true;
    } else {
      attributes.options = { ...attributes.options, autoplay: true };
    }
  }
  const nonce = el.dataset.nonce;
  createRoot(el).render(<VideoPlayer attributes={attributes} nonce={nonce} />);

  el.removeAttribute("data-attributes");
  el.removeAttribute("data-nonce");

  // Hand sizing back to the player once it can size itself (see render.php).
  watchReservedSpace(el);
};

/**
 * Self-hosted players mount as they near the viewport; YouTube/Vimeo stay a thumbnail until clicked,
 * because their embeds download ~1MB of third-party script. Autoplay players mount right away.
 */
const setup = (el: HTMLElement) => {
  if (el.dataset.h5vpMounted || el.dataset.h5vpPending || !el.dataset.attributes) return;

  let attributes: any;
  try {
    attributes = JSON.parse(el.dataset.attributes);
  } catch {
    return;
  }

  const placeholder = el.querySelector<HTMLElement>(".h5vp-placeholder");
  // No placeholder means markup rendered before this version (e.g. an old cached page): mount as before.
  if (!placeholder || attributes?.options?.autoplay) {
    mount(el);
    return;
  }

  el.dataset.h5vpPending = "1";
  const playNow = (event?: Event) => {
    event?.preventDefault();
    if (el.dataset.h5vpMounted) {
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
  document.querySelectorAll<HTMLElement>('[class^="wp-block-html5-player-"]').forEach(setup);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

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
