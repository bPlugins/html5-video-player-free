import { useState, useEffect, useCallback, useRef } from "react";
import { PlaylistVideo, PlaylistRuntimeOptions } from "src/blocks/playlist/types";

// Pro's usePlaylist.ts uses the same 5s window; changing it here would make the
// auto-advance visibly different before and after an upgrade.
export const COUNTDOWN_SECONDS = 5;

interface UsePlaylistProps {
  videos: PlaylistVideo[];
  options: PlaylistRuntimeOptions;
  /** Start the first video as soon as the player is ready (the visitor pressed play before it mounted). */
  startPlaying?: boolean;
}

export const usePlaylist = ({ videos, options, startPlaying = false }: UsePlaylistProps) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isEnded, setIsEnded] = useState<boolean>(false);
  const [showUpNext, setShowUpNext] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(COUNTDOWN_SECONDS);
  const [shouldAutoPlay, setShouldAutoPlay] = useState<boolean>(startPlaying);

  const countdownTimerRef = useRef<any>(null);

  const currentVideo = videos[currentVideoIndex] || videos[0] || null;
  const hasNext = currentVideoIndex < videos.length - 1;
  const nextVideo = hasNext ? videos[currentVideoIndex + 1] : null;

  const cancelUpNext = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setShowUpNext(false);
    setCountdownSeconds(COUNTDOWN_SECONDS);
  }, []);

  const selectVideo = useCallback(
    (index: number, play: boolean = true) => {
      cancelUpNext();
      if (index >= 0 && index < videos.length) {
        setCurrentVideoIndex(index);
        setIsEnded(false);
        setShouldAutoPlay(play);
        if (play) {
          setIsPlaying(true);
        }
      }
    },
    [videos.length, cancelUpNext]
  );

  const playNext = useCallback(() => {
    cancelUpNext();
    if (hasNext) {
      selectVideo(currentVideoIndex + 1, true);
    }
  }, [hasNext, currentVideoIndex, selectVideo, cancelUpNext]);

  const playPrev = useCallback(() => {
    cancelUpNext();
    if (currentVideoIndex > 0) {
      selectVideo(currentVideoIndex - 1, true);
    }
  }, [currentVideoIndex, selectVideo, cancelUpNext]);

  const onVideoEnded = useCallback(() => {
    setIsPlaying(false);
    setIsEnded(true);

    if (options.autoplayNextVideo && hasNext && nextVideo) {
      setShowUpNext(true);
      setCountdownSeconds(COUNTDOWN_SECONDS);

      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }

      // The tick only decrements. Advancing to the next video is a side effect
      // and must not live inside a state updater — React treats updaters as
      // pure and may re-run them, which would fire the advance more than once.
      countdownTimerRef.current = setInterval(() => {
        setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
  }, [options.autoplayNextVideo, hasNext, nextVideo]);

  // Advance once the countdown actually reaches zero.
  useEffect(() => {
    if (!showUpNext || countdownSeconds > 0) return;

    cancelUpNext();
    selectVideo(currentVideoIndex + 1, true);
  }, [showUpNext, countdownSeconds, currentVideoIndex, selectVideo, cancelUpNext]);

  const onVideoPlay = useCallback(() => {
    cancelUpNext();
    setIsPlaying(true);
    setIsEnded(false);
  }, [cancelUpNext]);

  const onVideoPause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  return {
    currentVideoIndex,
    currentVideo,
    nextVideo,
    isPlaying,
    isEnded,
    showUpNext,
    countdownSeconds,
    shouldAutoPlay,
    selectVideo,
    playNext,
    playPrev,
    cancelUpNext,
    onVideoEnded,
    onVideoPlay,
    onVideoPause,
  };
};

export default usePlaylist;
