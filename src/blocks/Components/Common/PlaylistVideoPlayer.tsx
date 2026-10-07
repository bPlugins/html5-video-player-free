import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { PlaylistVideo, PlaylistRuntimeOptions } from "src/blocks/playlist/types";
import MyPlayer from "src/public/MyPlayer";
import isYoutubeURL from "../../../../../wp-utils/v1/isYoutubeURL";
import isVimeoLink from "src/utils/isVimeoLink";
import UpNextCountdown from "./playlist/UpNextCountdown";
import { formatDuration, setCachedDuration } from "./playlist/useVideoDuration";
import { isIOS } from "src/utils/isIOS";

export interface PlaylistPlayerHandle {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
}

interface PlaylistVideoPlayerProps {
  video: PlaylistVideo;
  options: PlaylistRuntimeOptions;
  uniqueId: string;
  shouldAutoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  showUpNext?: boolean;
  nextVideo?: PlaylistVideo | null;
  countdownSeconds?: number;
  onCancelUpNext?: () => void;
  onPlayNow?: () => void;
  /** Visitor pressed play on the click-to-load stand-in. */
  onRequestPlay?: () => void;
  /** Thumbnail for the stand-in when the item has none of its own. */
  placeholderThumb?: string;
}

const youtubeThumb = (embedUrl: string) => {
  const id = embedUrl.match(/\/embed\/([\w-]{11})/)?.[1];
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
};

const DEFAULT_CONTROLS = [
  "play-large",
  "play",
  "progress",
  "current-time",
  "mute",
  "volume",
  "captions",
  "settings",
  "fullscreen",
];

// Plyr builds a brand-new <video> for every source change, so these have to be
// re-applied after a swap — without the aspect ratio the host collapses to zero
// height until the new metadata lands.
const applyMediaStyle = (media?: HTMLElement | null) => {
  if (!media) return;
  media.style.width = "100%";
  media.style.maxWidth = "100%";
  media.style.aspectRatio = "16/9";
};

const PlaylistVideoPlayer = forwardRef<PlaylistPlayerHandle, PlaylistVideoPlayerProps>(
  function PlaylistVideoPlayer(
    {
      video,
      options,
      uniqueId,
      shouldAutoPlay = false,
      onPlay,
      onPause,
      onEnded,
      showUpNext = false,
      nextVideo = null,
      countdownSeconds = 5,
      onCancelUpNext,
      onPlayNow,
      onRequestPlay,
      placeholderThumb = "",
    },
    ref
  ) {
    const mediaHostRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<MyPlayer | null>(null);
    // What the live player was last handed. Lets the swap effect tell a change
    // the build effect has already applied from one it still has to perform.
    const appliedRef = useRef<{ source: string; poster: string } | null>(null);

    const provider = video?.h5vp_video_provider || "library";
    const isLibrary = provider === "library";
    const rawSource = isLibrary ? video?.video_source : video?.h5vp_video_source;
    const poster = video?.video_thumb || "";

    const resolvedProvider = isLibrary
      ? "self-hosted"
      : provider === "youtube"
      ? "youtube"
      : provider === "vimeo"
      ? "vimeo"
      : "self-hosted";

    const videoSrc = isLibrary
      ? rawSource || ""
      : resolvedProvider === "youtube"
      ? isYoutubeURL(rawSource || "")
      : resolvedProvider === "vimeo"
      ? (isVimeoLink(rawSource || "") as string)
      : rawSource || "";

    // A YouTube/Vimeo player pulls ~1 MB from their servers the moment it is built. Until the visitor
    // asks for playback (stand-in click, a playlist row, autoplay) the first item shows a thumbnail
    // stand-in instead; once playback has been asked for, every later item builds as before.
    const isEmbed = resolvedProvider === "youtube" || resolvedProvider === "vimeo";
    const [embedAllowed, setEmbedAllowed] = useState(shouldAutoPlay);
    useEffect(() => {
      if (shouldAutoPlay) setEmbedAllowed(true);
    }, [shouldAutoPlay]);
    // iPhone/iPad: an embed built after the tap can't use that tap any more (YouTube refuses to start,
    // Vimeo starts muted), so there the player is built right away and the visitor's tap reaches it.
    const showStandIn = isEmbed && !embedAllowed && !!rawSource && !isIOS();
    const standInThumb = poster || placeholderThumb || (resolvedProvider === "youtube" ? youtubeThumb(videoSrc || "") : "");
    const requestPlay = () => {
      setEmbedAllowed(true);
      onRequestPlay?.();
    };

    // The build effect deliberately keeps these out of its dependency list — it
    // must not tear the player down because a callback identity or the autoplay
    // flag changed — so it reads them through a ref every render refreshes.
    const latestRef = useRef({ video, options, poster, shouldAutoPlay, onPlay, onPause, onEnded, rawSource, showStandIn, requestPlay });
    latestRef.current = { video, options, poster, shouldAutoPlay, onPlay, onPause, onEnded, rawSource, showStandIn, requestPlay };

    // Caches the live player's duration under the *current* track's source URL.
    // rawSource must come through latestRef: the build effect's player event
    // handlers survive an in-place source swap (its deps don't change for
    // library-to-library switches), so a closed-over rawSource would keep
    // caching the new track's duration under the previous track's URL.
    const cachePlayerDuration = () => {
      const dur = playerRef.current?.player?.duration;
      const src = latestRef.current.rawSource;
      if (dur && src) {
        const formatted = formatDuration(dur);
        if (formatted) {
          setCachedDuration(src, formatted);
        }
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        play() {
          if (!playerRef.current && latestRef.current.showStandIn) {
            latestRef.current.requestPlay();
            return;
          }
          playerRef.current?.player?.play?.()?.catch?.(() => {});
        },
        pause() {
          playerRef.current?.player?.pause?.();
        },
        togglePlay() {
          const plyr = playerRef.current?.player;
          if (!plyr) {
            if (latestRef.current.showStandIn) latestRef.current.requestPlay();
            return;
          }
          if (plyr.playing) {
            plyr.pause();
          } else {
            plyr.play?.()?.catch?.(() => {});
          }
        },
      }),
      []
    );

    // Embeds have to be rebuilt for every source: their media element is an
    // <iframe> that MyPlayer.setSource() cannot re-point. Self-hosted video is
    // rebuilt only when the provider changes or a source appears/disappears —
    // switching between two library videos swaps the source in place instead,
    // which is what stops the player from blinking.
    const buildKey =
      resolvedProvider === "self-hosted"
        ? `self-hosted|${rawSource ? "has-source" : "no-source"}`
        : `${resolvedProvider}|${rawSource || ""}`;

    useEffect(() => {
      const host = mediaHostRef.current;
      if (!host || !rawSource || showStandIn) return;

      const { poster: currentPoster, options: opts, video: currentVideo } = latestRef.current;

      // Destroy existing player instance and clean DOM slot safely
      if (playerRef.current) {
        try {
          playerRef.current.destroy?.();
        } catch (err) {
          // ignore cleanup error
        }
        playerRef.current = null;
      }
      host.innerHTML = "";

      let mediaEl: HTMLElement;

      if (resolvedProvider === "youtube") {
        const wrapper = document.createElement("div");
        wrapper.className = "plyr__video-embed player_youtube h5vp_player";
        const iframe = document.createElement("iframe");
        iframe.src = `${videoSrc}?origin=${window.location.origin}&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1`;
        iframe.allowFullscreen = true;
        iframe.allow = "autoplay";
        iframe.title = currentVideo?.video_title || "YouTube video player";
        wrapper.appendChild(iframe);
        host.appendChild(wrapper);
        mediaEl = wrapper;
      } else if (resolvedProvider === "vimeo") {
        const wrapper = document.createElement("div");
        wrapper.className = "plyr__video-embed player_vimeo h5vp_player";
        const iframe = document.createElement("iframe");
        iframe.src = `${videoSrc}?loop=false&byline=false&portrait=false&title=false&speed=true&transparent=0&gesture=media`;
        iframe.allowFullscreen = true;
        iframe.allow = "autoplay";
        iframe.title = currentVideo?.video_title || "Vimeo video player";
        wrapper.appendChild(iframe);
        host.appendChild(wrapper);
        mediaEl = wrapper;
      } else {
        const videoTag = document.createElement("video");
        videoTag.className = "h5vp_player";
        videoTag.setAttribute("playsinline", "true");
        applyMediaStyle(videoTag);
        if (currentPoster) {
          videoTag.setAttribute("data-poster", currentPoster);
          videoTag.poster = currentPoster;
        }
        if (opts.muted) {
          videoTag.muted = true;
        }
        const sourceTag = document.createElement("source");
        sourceTag.src = videoSrc;
        sourceTag.type = "video/mp4";
        videoTag.appendChild(sourceTag);
        host.appendChild(videoTag);
        mediaEl = videoTag;
      }

      const attributes = {
        source: videoSrc,
        poster: currentPoster,
        provider: resolvedProvider,
        uniqueId: `${uniqueId}_plyr`,
        options: {
          controls: opts.controls || DEFAULT_CONTROLS,
          autoplay: latestRef.current.shouldAutoPlay,
          muted: opts.muted || false,
          hideControls: opts.hideControls !== false,
          resetOnEnd: opts.resetOnEnd !== false,
          playsinline: true,
          seekTime: opts.seekTime || 10,
        },
        subtitle: [],
        features: {},
      };

      const player = new MyPlayer(mediaEl as HTMLVideoElement, attributes, {
        isBackend: false,
        provider: resolvedProvider,
      });

      playerRef.current = player;
      appliedRef.current = { source: videoSrc, poster: currentPoster };

      if (player.player) {
        // The handlers read their callback off latestRef rather than closing
        // over it: this effect no longer re-runs on a source change, so a
        // captured onEnded would go stale the moment the track advances.
        player.player.on("play", () => latestRef.current.onPlay?.());
        player.player.on("pause", () => latestRef.current.onPause?.());
        player.player.on("ended", () => latestRef.current.onEnded?.());

        player.player.on("loadedmetadata", cachePlayerDuration);
        player.player.on("durationchange", cachePlayerDuration);
        player.player.on("timeupdate", cachePlayerDuration);
        player.player.on("playing", cachePlayerDuration);
        player.player.on("ready", () => {
          cachePlayerDuration();
          if (!latestRef.current.shouldAutoPlay) return;
          player.player.play?.()?.catch?.(() => {});
        });
      }

      return () => {
        try {
          player.destroy?.();
        } catch (err) {
          // ignore
        }
        playerRef.current = null;
        appliedRef.current = null;
        if (host) {
          host.innerHTML = "";
        }
      };
    }, [buildKey, uniqueId, showStandIn]);

    // In-place source swap for self-hosted items — the whole point is to leave
    // the Plyr instance and its container standing so the playlist does not
    // blink when one library video is replaced by another.
    useEffect(() => {
      if (resolvedProvider !== "self-hosted") return;

      const player = playerRef.current;
      const applied = appliedRef.current;
      if (!player || !applied || !videoSrc) return;
      if (applied.source === videoSrc && applied.poster === poster) return;

      const sourceChanged = applied.source !== videoSrc;
      appliedRef.current = { source: videoSrc, poster };

      const plyr = player.player;
      const host = mediaHostRef.current;

      // MyPlayer.setSource() reads the poster back off the Plyr instance, so the
      // new thumbnail has to be on the media element before the swap runs.
      player.poster = poster;
      const media = (plyr?.media || player.media) as HTMLVideoElement | undefined;
      if (media) {
        if (poster) {
          media.setAttribute("poster", poster);
          media.setAttribute("data-poster", poster);
        } else {
          media.removeAttribute("poster");
          media.removeAttribute("data-poster");
        }
      }
      player.setPoster(poster);

      // A new thumbnail on the same video is just a poster update — reloading
      // the source for it would throw away playback position for nothing.
      if (!sourceChanged) return;

      // Plyr drops its wrapper and rebuilds it for a source change, so the host
      // can momentarily collapse. Pinning the height it already has is what
      // keeps the surrounding playlist from jumping.
      const lockedHeight = host?.getBoundingClientRect().height || 0;
      if (host && lockedHeight) {
        host.style.minHeight = `${lockedHeight}px`;
      }

      player.setSource(videoSrc);
      player.setPoster(poster);

      const settle = () => {
        applyMediaStyle(playerRef.current?.player?.media);
        if (host) {
          host.style.minHeight = "";
        }
        cachePlayerDuration();
        if (latestRef.current.shouldAutoPlay) {
          playerRef.current?.player?.play?.()?.catch?.(() => {});
        }
      };

      // Plyr re-emits "ready" once the new media is built; the timer is only a
      // backstop so the pinned height can never be left behind.
      if (typeof plyr?.once === "function") {
        plyr.once("ready", settle);
      }
      const settleTimer = window.setTimeout(settle, 600);

      return () => window.clearTimeout(settleTimer);
    }, [videoSrc, poster, resolvedProvider]);

    return (
      <div
        className="video__top video__wrapper plyr_wrapper skin-default"
        style={{ position: "relative" }}
      >
        {showStandIn && (
          // Same markup and classes as the server stand-in (h5vp_player_placeholder), so mounting doesn't flash.
          <div
            className="preload_poster h5vp-placeholder"
            role="button"
            tabIndex={0}
            aria-label={video?.video_title ? `Play ${video.video_title}` : "Play video"}
            onClick={requestPlay}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                requestPlay();
              }
            }}
          >
            {standInThumb && <img className="h5vp-placeholder-image" src={standInThumb} alt="" decoding="async" />}
            <span className="h5vp-placeholder-play" aria-hidden="true" />
          </div>
        )}
        <div ref={mediaHostRef} style={{ width: "100%", height: "100%", display: showStandIn ? "none" : undefined }} />

        {showUpNext && nextVideo && onCancelUpNext && onPlayNow && (
          <UpNextCountdown
            nextVideo={nextVideo}
            secondsRemaining={countdownSeconds}
            onCancel={onCancelUpNext}
            onPlayNow={onPlayNow}
          />
        )}
      </div>
    );
  }
);

export default PlaylistVideoPlayer;
