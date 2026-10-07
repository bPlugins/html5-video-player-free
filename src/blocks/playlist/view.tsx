import React, { useRef } from "react";
import ReactDOM from "react-dom";
import { PlaylistRuntimeData } from "./types";
import { usePlaylist } from "src/blocks/Components/Common/playlist/usePlaylist";
import PlaylistVideoPlayer, {
  PlaylistPlayerHandle,
} from "src/blocks/Components/Common/PlaylistVideoPlayer";
import PlaylistSimple from "src/blocks/Components/Common/playlist/PlaylistSimple";
import "src/playlist.scss";
import { playMounted, whenNearViewport } from "src/utils/lazyMount";

// Support both React 18 createRoot and legacy render
const renderRoot = (container: HTMLElement, element: React.ReactElement) => {
  if (typeof (ReactDOM as any).createRoot === "function") {
    (ReactDOM as any).createRoot(container).render(element);
  } else {
    (ReactDOM as any).render(element, container);
  }
};

interface PlaylistAppProps {
  data: PlaylistRuntimeData;
  nonce?: string;
  startPlaying?: boolean;
}

// render.php emits CSS-cased keys ("max-width") because that payload is shared
// verbatim with Pro, which feeds it to a <style> writer. React's style prop wants
// camelCase and warns on anything else, so translate at the boundary rather than
// diverging from the payload contract.
const toReactStyle = (styles?: Record<string, any>): React.CSSProperties => {
  if (!styles) return {};

  return Object.keys(styles).reduce((acc: Record<string, any>, key) => {
    const camelKey = key.startsWith("--")
      ? key
      : key.replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase());
    acc[camelKey] = styles[key];
    return acc;
  }, {});
};

const PlaylistApp: React.FC<PlaylistAppProps> = ({ data, startPlaying = false }) => {
  const { videos = [], options, uniqueId, styles, placeholderThumb } = data;

  const {
    currentVideoIndex,
    currentVideo,
    nextVideo,
    isPlaying,
    showUpNext,
    countdownSeconds,
    shouldAutoPlay,
    selectVideo,
    cancelUpNext,
    onVideoEnded,
    onVideoPlay,
    onVideoPause,
  } = usePlaylist({ videos, options, startPlaying });

  // The playlist rows need to reach the live player to toggle playback; the
  // player owns the Plyr instance, so it exposes it through this handle.
  const playerHandleRef = useRef<PlaylistPlayerHandle>(null);

  if (!videos || videos.length === 0 || !currentVideo) {
    return null;
  }

  return (
    <div id={uniqueId} className="video video--bg simplelist">
      <div
        className="h5vp_playlist_container playlist_loaded"
        style={toReactStyle(styles?.h5vp_playlist_container)}
      >
        <PlaylistVideoPlayer
          ref={playerHandleRef}
          video={currentVideo}
          options={options}
          uniqueId={uniqueId}
          shouldAutoPlay={shouldAutoPlay}
          onPlay={onVideoPlay}
          onPause={onVideoPause}
          onEnded={onVideoEnded}
          showUpNext={showUpNext}
          nextVideo={nextVideo}
          countdownSeconds={countdownSeconds}
          placeholderThumb={currentVideoIndex === 0 ? placeholderThumb : ""}
          onRequestPlay={() => selectVideo(currentVideoIndex, true)}
          onCancelUpNext={cancelUpNext}
          onPlayNow={() => {
            cancelUpNext();
            if (nextVideo) {
              selectVideo(currentVideoIndex + 1, true);
            }
          }}
        />

        <PlaylistSimple
          videos={videos}
          currentIndex={currentVideoIndex}
          isPlaying={isPlaying}
          onSelectVideo={(idx) => selectVideo(idx, true)}
          onTogglePlay={() => playerHandleRef.current?.togglePlay()}
        />
      </div>
    </div>
  );
};

const mountPlaylist = (el: HTMLElement, startPlaying = false) => {
  if (el.dataset.h5vpMounted || !el.dataset.attributes) return;

  try {
    const data: PlaylistRuntimeData = JSON.parse(el.dataset.attributes);
    const nonce = el.dataset.nonce;

    el.dataset.h5vpMounted = "true";
    renderRoot(el, <PlaylistApp data={data} nonce={nonce} startPlaying={startPlaying} />);
  } catch (err) {
    console.error("Failed to mount HTML5 Video Player playlist:", err);
  }
};

// render.php prints a static copy of the playlist (player placeholder + titles); the app replaces it
// as it nears the viewport, or straight away when the placeholder is clicked.
const mountPlaylists = () => {
  document.querySelectorAll<HTMLElement>(".h5vp_playlist").forEach((el) => {
    if (el.dataset.h5vpMounted || el.dataset.h5vpPending || !el.dataset.attributes) return;

    const placeholder = el.querySelector<HTMLElement>(".h5vp-placeholder");
    // Markup from before this version has no placeholder: mount as before.
    if (!placeholder) {
      mountPlaylist(el);
      return;
    }

    el.dataset.h5vpPending = "true";
    const playNow = (event?: Event) => {
      event?.preventDefault();
      if (el.dataset.h5vpMounted) {
        playMounted(el);
        return;
      }
      mountPlaylist(el, true);
    };
    placeholder.addEventListener("click", playNow, { once: true });
    placeholder.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") playNow(event);
    });
    whenNearViewport(el, () => mountPlaylist(el));
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountPlaylists);
} else {
  mountPlaylists();
}

window.addEventListener("elementor/frontend/init", () => {
  (window as any).elementorFrontend?.hooks?.addAction(
    "frontend/element_ready/H5VPPlaylist.default",
    mountPlaylists
  );
});

export default PlaylistApp;
