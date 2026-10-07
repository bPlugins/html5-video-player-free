import { useMemo } from 'react';

import './style.scss';
import './skins.scss';
import Video from './Video';
import isYoutubeURL from '../../../../../wp-utils/v1/isYoutubeURL';
import Youtube from './Youtube';
import isVimeoLink from '../../../utils/isVimeoLink';
import Style from './Style';
import Vimeo from './Vimeo';
import generateUniqueID from '../../../../../wp-utils/v1/generateUniqueId';
import useVideoSource from '../../../hooks/useVideoSource';
import usePlayerLifecycle from '../../../hooks/usePlayerLifecycle';
import { VideoPlayerAttributes } from '../../../interfaces/MyPlayerInterface';
import { BlockAttributes, PresetProps } from 'src/blocks/types';
import { DEFAULT_PRESETS } from '../../constants';

interface VideoPlayerProps {
  attributes: BlockAttributes;
  nonce?: string;
  isBackend?: boolean;
  clientId?: string | null;
}

const VideoPlayer = ({
  attributes,
  nonce = window.h5vpBlock?.nonce,
  isBackend = false,
}: VideoPlayerProps) => {
  //@ts-ignore
  const { presetId, is_classic = false } = attributes;

  /** Resolve the preset from the default preset list by id. */
  const preset = useMemo<PresetProps>(
    () => (presetId ? DEFAULT_PRESETS.find((p) => p?.id === presetId) ?? null : null),
    [presetId]
  );

  const effectiveAttributes = useMemo<VideoPlayerAttributes>(() => {
    if (!presetId || !preset || !preset?.settings || is_classic) return attributes as unknown as VideoPlayerAttributes;

    try {
      const presetData = typeof preset.settings === 'string'
        ? JSON.parse(preset.settings)
        : preset.settings;

      const finalAttributes = {
        ...attributes,
        skin: attributes.skin,
        options: { ...attributes.options, ...presetData.options, ratio: attributes.options.ratio },
        ...(presetData.styles && { styles: { ...attributes.styles, ...presetData.styles } }),
      } as unknown as VideoPlayerAttributes;

      finalAttributes.options.resetOnEnd = attributes.options.resetOnEnd;
      finalAttributes.options.hideControls = attributes.options.hideControls;
      // Same treatment as the two above: these stay user-owned, so picking a
      // preset never silently reverts the inline-playback or preload choice.
      finalAttributes.options.playsinline = attributes.options.playsinline;
      finalAttributes.options.preload = attributes.options.preload;
      return finalAttributes;
    } catch {
      return attributes as unknown as VideoPlayerAttributes;
    }
  }, [attributes, presetId, preset]);

  const { source, poster, provider, options, uniqueId, styles, skin } = effectiveAttributes;
  const { autoplay, muted, loop } = options;

  const { src, videoSource } = useVideoSource({
    source,
    provider,
    uniqueId: uniqueId as string,
  });

  const { containerRef } = usePlayerLifecycle({
    attributes: effectiveAttributes,
    nonce,
    isBackend,
    src,
    videoSource,
    isLoading: false,
  });

  if (!source) {
    return <h3>Video source missing</h3>;
  }

  return (
    <div
      ref={containerRef}
      id={uniqueId}
      className="h5vp_player_temp"
    >
      <Style styles={styles} uniqueId={uniqueId as string} />

      <div
        //@ts-ignore
        className={`plyr_wrapper skin-${attributes.tempSkin ? skin : 'default'} ${poster ? 'has-custom-poster' : ''}`}
        data-unique-id={generateUniqueID(5)}
        key={JSON.stringify({ options, presetId, poster })}
      >
        {videoSource === 'vimeo' && <Vimeo source={isVimeoLink(src) as string} data-poster={poster as string} />}
        {videoSource === 'youtube' && <Youtube source={isYoutubeURL(src)} data-poster={poster as string} />}

        {['self-hosted', 'amazons3'].includes(videoSource) && (
          <Video
            source={src}
            captions={effectiveAttributes.subtitle}
            poster={poster ?? ''}
            autoPlay={autoplay}
            muted={muted}
            loop={loop?.active}
            preload={options.preload || 'metadata'}
            playsInline={options.playsinline}
          />
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
