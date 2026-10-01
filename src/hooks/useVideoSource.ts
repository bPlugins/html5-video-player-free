import { useState, useEffect } from 'react';
import isYoutubeURL from '../../../wp-utils/v1/isYoutubeURL';
import isVimeoLink from '../utils/isVimeoLink';

type VideoSourceType = 'youtube' | 'vimeo' | 'self-hosted' | 'amazons3';

interface UseVideoSourceOptions {
    source: string;
    provider?: string;
    uniqueId: string;
    streaming?: boolean;
    passwordProtected?: { enabled: boolean };

}

interface UseVideoSourceReturn {
    src: string;
    setSrc: React.Dispatch<React.SetStateAction<string>>;
    videoSource: VideoSourceType;
    setVideoSource: React.Dispatch<React.SetStateAction<VideoSourceType>>;
}

/**
 * Consolidates video-source logic:
 *  - Provider detection (YouTube / Vimeo / self-hosted)
 *  - XOR decoding when streaming is enabled
 *  - Password-protected blank-source handling
 */
const useVideoSource = ({
    source,
    provider,
    passwordProtected,
}: UseVideoSourceOptions): UseVideoSourceReturn => {


    const detectProvider = (raw: string): VideoSourceType => {
        if (provider && provider !== 'library') return provider as VideoSourceType;
        if (provider === 'library') return 'self-hosted';
        if (isYoutubeURL(raw)) return 'youtube';
        if (isVimeoLink(raw)) return 'vimeo';
        return 'self-hosted';
    };

    const [src, setSrc] = useState(() => source);
    const [videoSource, setVideoSource] = useState<VideoSourceType>(() => detectProvider(source));

    // Re-sync src when the raw source changes
    useEffect(() => {
        setSrc(source);
    }, [source]);

    // Re-detect provider when provider or source changes
    useEffect(() => {
        setVideoSource(detectProvider(source));
    }, [source, provider]);

    return { src, setSrc, videoSource, setVideoSource };
};

export default useVideoSource;
