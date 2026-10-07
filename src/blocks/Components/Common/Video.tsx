import { QualityItem, CaptionItem } from '../../../interfaces/MyPlayerInterface';
import { buildCaptionTracks } from '../../../public/MyPlayer';

// ────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────

interface VideoProps {
  poster: string;
  source: string;

  className?: string;
  reference?: React.Ref<HTMLVideoElement>;
  qualities?: QualityItem[];
  captions?: CaptionItem[];
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: string;
  playsInline?: boolean;
  'data-poster'?: string;
  style?: React.CSSProperties;
  src?: string;
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

const Video = ({
  poster,
  source,
  className = '',
  reference,
  qualities,
  captions,
  preload,
  'data-poster': dataPoster,
  ...props
}: VideoProps) => (
  <>
    {/* crossOrigin attr should not use */}
    {/* Rendered with preload="none": Plyr moves the <video> into its own wrapper, and a load already in
        flight when that happens is restarted (every range request doubled). MyPlayer applies the real
        preload from data-h5vp-preload once the element is in its final place. */}
    <video
      className={`h5vp_player ${className}`}
      id="player"
      data-poster={poster || ''}
      ref={reference}
      style={{ width: '100%', maxWidth: '100%', aspectRatio: '16/9' }}
      preload="none"
      data-h5vp-preload={preload || 'metadata'}
      {...props}
    >
      {source && <source src={source} type="video/mp4" />
      }
      {/* Present before Plyr is constructed, so captions work without a source swap. */}
      {buildCaptionTracks(captions).map((track) => (
        <track key={track.src} kind={track.kind as 'captions'} label={track.label} srcLang={track.srclang} src={track.src} />
      ))}
    </video>

    {dataPoster && (
      <div
        className="preload_poster"
        style={{ background: `url(${dataPoster})` }}
      />
    )}
  </>
);

export default Video;
