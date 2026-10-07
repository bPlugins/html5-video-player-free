import React from "react";
// eslint-disable-next-line no-unused-vars
import ReactDOM from "react-dom"; // don't remove it — this import is what puts

import AudioPlayer from './player/AudioPlayer';
import "./style.scss";
import { whenNearViewport } from "src/utils/lazyMount";

const renderRoot = (container: HTMLElement, element: React.ReactElement) => {
  if (typeof (ReactDOM as any).createRoot === "function") {
    (ReactDOM as any).createRoot(container).render(element);
  } else {
    (ReactDOM as any).render(element, container);
  }
};

const initPlayer = () => {
  document.querySelectorAll<HTMLElement>(".h5vp_audio_player").forEach((block) => {
    // DOMContentLoaded and a page builder's own ready hook can both fire, so
    // never root the same container twice.
    if (block.dataset.h5vpMounted || block.dataset.h5vpPending || !block.dataset.attributes) return;

    let attributes: any;
    try {
      attributes = JSON.parse(block.dataset.attributes);
    } catch (err) {
      console.error("Failed to mount HTML5 Video Player audio block:", err);
      return;
    }

    const mount = () => {
      if (block.dataset.h5vpMounted) return;
      block.dataset.h5vpMounted = "true";
      renderRoot(block, <AudioPlayer attributes={attributes} />);
      block.removeAttribute("data-attributes");
    };

    // Below-the-fold players mount (and start fetching metadata) only as they near the viewport.
    if (attributes?.autoplay) {
      mount();
    } else {
      block.dataset.h5vpPending = "true";
      whenNearViewport(block, mount);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlayer);
} else {
  initPlayer();
}
