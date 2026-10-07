import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioEngineOptions {
    source: string;
    autoplay?: boolean;
    loop?: boolean;
    preload?: "none" | "metadata" | "auto";
}

export const clamp = (val: number, min = 0, max = 1) => Math.min(max, Math.max(min, val));

export const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return "0:00";
    }
    const total = Math.floor(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
};

export const useAudioEngine = ({ source, autoplay, loop, preload = "metadata" }: AudioEngineOptions) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const frameRef = useRef<number>(0);
    const pendingSeekRatioRef = useRef<number | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [progress, setProgress] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolumeState] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRateState] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Update buffered progress
    const updateBuffered = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !audio.duration) {
            setBuffered(0);
            return;
        }
        if (audio.buffered.length > 0) {
            const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
            setBuffered(clamp(bufferedEnd / audio.duration));
        }
    }, []);

    // Progress updates during playback. Four a second is plenty for the time readout, and the bar
    // eases between them in CSS; the previous per-frame loop re-rendered the whole player ~60x/s.
    useEffect(() => {
        if (!isPlaying) {
            return;
        }

        const tick = () => {
            const audio = audioRef.current;
            if (audio && audio.duration && !audio.paused) {
                const cur = audio.currentTime;
                setCurrentTime(cur);
                setProgress(clamp(cur / audio.duration));
            }
        };

        tick();
        frameRef.current = window.setInterval(tick, 250);
        return () => window.clearInterval(frameRef.current);
    }, [isPlaying]);

    // Handle source changes
    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        setProgress(0);
        setDuration(0);
        setBuffered(0);
        setHasError(false);
        pendingSeekRatioRef.current = null;
    }, [source]);

    const handleLoadedMetadata = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
        setDuration(dur);
        updateBuffered();

        if (pendingSeekRatioRef.current !== null && dur > 0) {
            const target = pendingSeekRatioRef.current * dur;
            pendingSeekRatioRef.current = null;
            audio.currentTime = target;
            setCurrentTime(target);
            setProgress(clamp(target / dur));
        }
    }, [updateBuffered]);

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (audio.paused) {
            setIsLoading(true);
            audio.play()
                .then(() => {
                    setIsPlaying(true);
                    setIsLoading(false);
                })
                .catch(() => {
                    setIsPlaying(false);
                    setIsLoading(false);
                });
        } else {
            audio.pause();
            setIsPlaying(false);
        }
    }, []);

    const play = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio) return;
        try {
            await audio.play();
            setIsPlaying(true);
        } catch {
            setIsPlaying(false);
        }
    }, []);

    const pause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.pause();
        setIsPlaying(false);
    }, []);

    const seekToRatio = useCallback((ratio: number) => {
        const audio = audioRef.current;
        const targetRatio = clamp(ratio);
        setProgress(targetRatio);

        if (!audio) return;

        if (audio.duration && Number.isFinite(audio.duration)) {
            const targetTime = targetRatio * audio.duration;
            audio.currentTime = targetTime;
            setCurrentTime(targetTime);
        } else {
            pendingSeekRatioRef.current = targetRatio;
            audio.load();
        }
    }, []);

    const seekToTime = useCallback((timeInSeconds: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        if (audio.duration && Number.isFinite(audio.duration)) {
            const targetTime = clamp(timeInSeconds, 0, audio.duration);
            audio.currentTime = targetTime;
            setCurrentTime(targetTime);
            setProgress(clamp(targetTime / audio.duration));
        }
    }, []);

    const skip = useCallback((seconds: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        const cur = audio.currentTime || 0;
        const dur = audio.duration || 0;
        const target = dur ? clamp(cur + seconds, 0, dur) : Math.max(0, cur + seconds);
        audio.currentTime = target;
        setCurrentTime(target);
        if (dur) {
            setProgress(clamp(target / dur));
        }
    }, []);

    const setVolume = useCallback((val: number) => {
        const audio = audioRef.current;
        const newVol = clamp(val, 0, 1);
        setVolumeState(newVol);
        if (audio) {
            audio.volume = newVol;
            if (newVol > 0 && audio.muted) {
                audio.muted = false;
                setIsMuted(false);
            }
        }
    }, []);

    const toggleMute = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const nextMuted = !audio.muted;
        audio.muted = nextMuted;
        setIsMuted(nextMuted);
    }, []);

    const setPlaybackRate = useCallback((rate: number) => {
        const audio = audioRef.current;
        setPlaybackRateState(rate);
        if (audio) {
            audio.playbackRate = rate;
        }
    }, []);

    const audioProps = {
        ref: audioRef,
        src: source,
        autoPlay: autoplay,
        loop,
        preload,
        onLoadedMetadata: handleLoadedMetadata,
        onDurationChange: handleLoadedMetadata,
        onProgress: updateBuffered,
        onPlay: () => {
            setIsPlaying(true);
            setIsLoading(false);
        },
        onPause: () => {
            setIsPlaying(false);
        },
        onEnded: () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        },
        onWaiting: () => setIsLoading(true),
        onPlaying: () => setIsLoading(false),
        onError: () => {
            setHasError(true);
            setIsLoading(false);
            setIsPlaying(false);
        },
        onVolumeChange: () => {
            if (audioRef.current) {
                setVolumeState(audioRef.current.volume);
                setIsMuted(audioRef.current.muted);
            }
        },
        onTimeUpdate: () => {
            const audio = audioRef.current;
            if (audio && audio.paused && audio.duration) {
                setCurrentTime(audio.currentTime);
                setProgress(clamp(audio.currentTime / audio.duration));
            }
        }
    };

    return {
        audioRef,
        audioProps,
        isPlaying,
        currentTime,
        duration,
        progress,
        buffered,
        volume,
        isMuted,
        playbackRate,
        isLoading,
        hasError,
        togglePlay,
        play,
        pause,
        seekToRatio,
        seekToTime,
        skip,
        setVolume,
        toggleMute,
        setPlaybackRate
    };
};

export default useAudioEngine;

/** Shape returned by useAudioEngine — the prop type every shared part takes. */
export type AudioEngine = ReturnType<typeof useAudioEngine>;
