import { useEffect, useRef } from 'react';
import MyPlayer from '../public/MyPlayer';
import { VideoPlayerAttributes } from '../interfaces/MyPlayerInterface';


interface UsePlayerLifecycleOptions {
    attributes: VideoPlayerAttributes;
    nonce?: string;
    isBackend: boolean;
    src: string;
    videoSource: string;

    isLoading: boolean;
}

interface UsePlayerLifecycleReturn {
    playerRef: React.MutableRefObject<MyPlayer | null>;
    containerRef: React.RefObject<HTMLDivElement>;
}

const usePlayerLifecycle = ({
    attributes: effectiveAttributes,
    nonce,
    isBackend,
    src,
}: UsePlayerLifecycleOptions): UsePlayerLifecycleReturn => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<MyPlayer | null>(null);

    const { options, poster, provider, skin, subtitle } = effectiveAttributes;

    // ── Player init / destroy ───────────────────────────────────
    useEffect(() => {
        const media = containerRef.current?.querySelector('.h5vp_player');
        effectiveAttributes.source = src;
        if (media) {
            playerRef.current = new MyPlayer(
                media as HTMLVideoElement,
                effectiveAttributes,
                { isBackend, provider: provider as unknown as string },
            );
            playerRef.current.poster = poster ?? '';
        }

        return () => {
            playerRef.current?.destroy();
            playerRef.current = null;
        };
        // Compared by content: the editor hands down a fresh options object on every attribute change,
        // which used to destroy and rebuild Plyr (and reload the video) for unrelated edits.
    }, [JSON.stringify(options), poster, src, skin, JSON.stringify(subtitle)]);



    // ── Sync nonce & videoId ────────────────────────────────────
    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        if (!player.nonce && nonce) {
            player.setNonce(nonce);
        }
    }, [nonce]);

    // ── Poster update ───────────────────────────────────────────
    useEffect(() => {
        if (playerRef.current?.player && poster) {
            playerRef.current.setPoster(poster);
        }
    }, [poster]);

    //@ts-ignore
    return { playerRef, containerRef, effectiveAttributes };
};

export default usePlayerLifecycle;
