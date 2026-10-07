import { useState, useEffect, RefObject } from "react";
import { PlaylistProvider } from "src/blocks/playlist/types";

const durationCache = new Map<string, string>();
type DurationListener = (url: string, duration: string) => void;
const listeners = new Set<DurationListener>();

/**
 * Format duration in seconds into 'm:ss' or 'h:mm:ss'
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds <= 0) {
    return "";
  }
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;

  if (hours > 0) {
    const paddedMins = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${paddedMins}:${paddedSecs}`;
  }

  return `${minutes}:${paddedSecs}`;
};

/**
 * Update duration in cache from Plyr / player and notify list item subscribers
 */
export const setCachedDuration = (url: string, durationStr: string) => {
  if (!url || !durationStr) return;
  durationCache.set(url, durationStr);
  listeners.forEach((listener) => {
    try {
      listener(url, durationStr);
    } catch (err) {
      // ignore
    }
  });
};

/** Resolves after the page has finished loading and the browser is idle, so probes never compete with it. */
const afterPageLoad = new Promise<void>((resolve) => {
  const idle = () => {
    const ric = (window as any).requestIdleCallback;
    if (typeof ric === "function") {
      ric(() => resolve(), { timeout: 2000 });
    } else {
      window.setTimeout(resolve, 200);
    }
  };
  if (document.readyState === "complete") {
    idle();
  } else {
    window.addEventListener("load", idle, { once: true });
  }
});

// Probes run one at a time, after page load: each one opens a media request, and a long playlist used
// to fire them all at once while the page was still loading.
let probeQueue: Promise<void> = afterPageLoad;
const enqueueProbe = (task: () => Promise<void>) => {
  probeQueue = probeQueue.then(task, task);
};

/** Resolve once `el` is on (or near) screen; immediately when the browser can't tell. */
const whenVisible = (el: Element, onVisible: () => void): (() => void) => {
  if (typeof window.IntersectionObserver !== "function") {
    onVisible();
    return () => {};
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        onVisible();
      }
    },
    { rootMargin: "200px 0px" }
  );
  observer.observe(el);
  return () => observer.disconnect();
};

interface DurationProbeOptions {
  /** Probe only once this element is on screen (front end). Without it the probe runs straight away (editor). */
  ref?: RefObject<Element>;
  /** Don't probe at all — e.g. the item the player is already loading reports its own duration. */
  skip?: boolean;
}

/**
 * Reads duration from custom override, Plyrio player playback, or self-hosted metadata.
 */
export const useVideoDuration = (
  url?: string,
  provider: PlaylistProvider = "library",
  customDuration?: string,
  { ref, skip = false }: DurationProbeOptions = {}
): string => {
  const [duration, setDuration] = useState<string>(() => {
    if (customDuration) return customDuration;
    if (!url) return "";
    return durationCache.get(url) || "";
  });

  // Listen for duration updates from Plyrio player
  useEffect(() => {
    if (customDuration) {
      setDuration(customDuration);
      return;
    }

    const handleUpdate: DurationListener = (updatedUrl, updatedDuration) => {
      if (updatedUrl === url && updatedDuration) {
        setDuration(updatedDuration);
      }
    };

    listeners.add(handleUpdate);

    if (url && durationCache.has(url)) {
      setDuration(durationCache.get(url)!);
    }

    return () => {
      listeners.delete(handleUpdate);
    };
  }, [url, customDuration]);

  // For self-hosted media, probe metadata if not already cached
  useEffect(() => {
    if (customDuration || provider !== "library" || !url || skip) return;

    if (durationCache.has(url)) {
      setDuration(durationCache.get(url)!);
      return;
    }

    let isMounted = true;
    let tempVideo: HTMLVideoElement | null = null;
    let finish: (() => void) | null = null;

    const cleanup = () => {
      if (tempVideo) {
        tempVideo.removeAttribute("src");
        tempVideo.load();
        tempVideo = null;
      }
      finish?.();
      finish = null;
    };

    const probe = () =>
      new Promise<void>((resolve) => {
        // Skipped while queued: unmounted, or the player already cached this source.
        if (!isMounted || durationCache.has(url)) {
          if (isMounted && durationCache.has(url)) setDuration(durationCache.get(url)!);
          resolve();
          return;
        }

        finish = resolve;
        const video = document.createElement("video");
        tempVideo = video;
        video.preload = "metadata";
        video.addEventListener("loadedmetadata", () => {
          const formatted = formatDuration(video.duration);
          if (formatted) {
            setCachedDuration(url, formatted);
          }
          cleanup();
        }, { once: true });
        video.addEventListener("error", cleanup, { once: true });
        // Never let one stalled source hold up the rest of the queue.
        window.setTimeout(cleanup, 10000);
        video.src = url;
      });

    const stopWatching = ref?.current ? whenVisible(ref.current, () => enqueueProbe(probe)) : (enqueueProbe(probe), () => {});

    return () => {
      isMounted = false;
      stopWatching();
      cleanup();
    };
  }, [url, provider, customDuration, skip]);

  return customDuration || duration;
};

export default useVideoDuration;
