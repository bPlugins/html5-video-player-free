/**
 * Central TypeScript types for src/blocks.
 *
 * Derived from the block.json attribute schemas shared by
 * video / vimeo / youtube blocks.
 */

import { StylesMap } from "src/interfaces/MyPlayerInterface";
import { IconType } from "@wordpress/components";

export type SkinType = string;


/* ------------------------------------------------------------------ */
/*  WordPress global augmentations                                    */
/* ------------------------------------------------------------------ */

declare const h5vpBlock: { nonce: string } | undefined;
declare const h5vpAdmin: { nonce: string } | undefined;

/* ------------------------------------------------------------------ */
/*  Nested attribute sub-types                                        */
/* ------------------------------------------------------------------ */

export interface Padding {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface PopupBtnStyle {
  color: string;
  backgroundColor: string;
  fontSize: string;
  padding: Padding;
}

export interface PopupFeature {
  enabled: boolean;
  selector: string | null;
  hasBtn: boolean;
  type: "button" | "poster";
  btnText: string;
  align: string;
  btnStyle: PopupBtnStyle;
  isTrigger: boolean;
}

export interface OverlayItem {
  color: string;
  backgroundColor: string;
  fontSize: string;
  link: string;
  logo: string;
  text: string;
  position: string;
  type: "text" | "image" | "logo";
  opacity: number;
}

export interface OverlayFeature {
  enabled: boolean;
  items: OverlayItem[];
}

export interface EndScreenFeature {
  enabled: boolean;
  text: string;
  btnText: string;
  btnLink: string;
  btnStyle: Record<string, unknown>;
}

export interface ThumbInPauseFeature {
  enabled: boolean;
  type: string;
}

export interface WatermarkFeature {
  enabled: boolean;
  type: string;
  text: string;
  color: string;
}

export interface StickyFeature {
  enabled: boolean;
  position: string;
}

export interface PasswordProtectedButton {
  text: string;
  color: string;
  backgroundColor: string;
}

export interface PasswordProtectedFeature {
  enabled: boolean;
  password?: string;
  key?: string;
  errorMessage: string;
  heading: string;
  button: PasswordProtectedButton;
}



export interface Features {
  popup: PopupFeature;
  overlay: OverlayFeature;
  endScreen: EndScreenFeature;
  thumbInPause: ThumbInPauseFeature;
  watermark: WatermarkFeature;
  sticky: StickyFeature;
  passwordProtected?: PasswordProtectedFeature;
  playWhenVisible: boolean;
  disablePause: boolean;
  hideYoutubeUI: boolean;
  startTime: number | null;
  hideLoadingPlaceholder: boolean;
  customPlayButtonSelector?: string;
}

export interface CaptionsOption {
  active: boolean;
  enabled?: boolean;
  language: string;
  update: boolean;
}

export interface LoopOption {
  active: boolean;
}

export interface SpeedOption {
  options: (number | string)[];
}

export interface AdsOption {
  enabled: boolean;
  tagUrl: string | null;
}

export interface UrlsOption {
  enabled: boolean;
  download: string | null;
}

export interface MarkerPoint {
  time: number;
  label: string;
}

export interface MarkersOption {
  enabled: boolean;
  points: MarkerPoint[];
}

export interface Options {
  controls: string[];
  settings: string[];
  loadSprite: boolean;
  autoplay: boolean;
  playsinline: boolean;
  seekTime: number;
  volume: number;
  /** Starting volume in percent (0-100); empty keeps the player's usual start volume. */
  defaultVolume?: number | string;
  /** "contain" shows the whole video (black bars), "cover" fills the frame and crops. */
  fit?: "contain" | "cover";
  muted: boolean;
  hideControls: boolean;
  resetOnEnd: boolean;
  tooltips: { controls: boolean; seek: boolean };
  captions: CaptionsOption;
  ratio: string | null;
  storage: { enabled: boolean; key: string };
  speed: SpeedOption;
  loop: LoopOption;
  ads: AdsOption;
  urls: UrlsOption;
  markers: MarkersOption;
  preload: string;
  imported?: boolean;
}

export interface SEO {
  name?: string;
  title?: string;
  description: string;
  duration: string;
}

export interface OnlyLoggedIn {
  whoCanSeeThisVideo: string;
  allowedRoles: string[];
  message: string;
  enabled?: boolean;
}

export interface PlyrWrapperStyle {
  width: string;
  borderRadius?: string;
  overflow?: string;
}

export interface Styles {
  plyr_wrapper: PlyrWrapperStyle;
  plyr?: Record<string, string>;
}

export interface WidthAttr {
  deprecated?: boolean;
  isDeprecated?: boolean;
  number: number;
  unit: string;
}

export interface RadiusAttr {
  number: number;
  unit: string;
}

export interface SubtitleItem {
  label: string;
  caption_file: string;
}

export interface QualityItem {
  size: string | number;
  video_file: string;
}

/* ------------------------------------------------------------------ */
/*  Main block attributes interface                                   */
/* ------------------------------------------------------------------ */

export interface BlockAttributes {
  provider: string;
  presetId: number | string | null;
  preset: PresetProps;
  imported: boolean;
  clientId?: string;
  uniqueId?: string;
  source: string;
  poster: string;
  options: Options;
  features: Features;
  onlyLoggedIn: OnlyLoggedIn;
  seo: SEO;
  quality: QualityItem[];
  subtitle: SubtitleItem[];
  additionalCSS?: string;
  additionalID?: string;
  styles: StylesMap;
  CSS?: string;
  saveState: boolean;

  /* Deprecated / migration-only attributes (used by RefactorDataStructure) */
  autoplay?: boolean;
  autoHideControl?: boolean;
  muted?: boolean;
  playinline?: boolean;
  preload?: string;
  resetOnEnd?: boolean;
  ratio?: string | null;
  repeat?: boolean;
  radius?: RadiusAttr;
  seekTime?: number;
  speed?: Record<string, boolean>;
  width?: WidthAttr;
  chapters?: MarkerPoint[];
  controls?: Record<string, boolean>;
  captionEnabled?: boolean;
  CDURL?: string;
  isCDURL?: boolean;
  endscreen?: boolean;
  endscreenText?: string;
  endscreenTextLink?: string;
  endScreen?: EndScreenFeature;
  vastTag?: string;
  overlayFontSize?: { number: number; unit: string };
  thumbInPause?: boolean;
  watermark?: WatermarkFeature;
  popup?: boolean;
  popupBtnStyle?: PopupBtnStyle & { align?: string };
  popupBtnText?: string;
  popupBtnClass?: string;
  popupBtnExists?: boolean;
  autoplayWhenVisible?: boolean;
  popupType?: string;
  disablePause?: boolean;
  startTime?: number;
  hideYoutubeUI?: boolean;
  overlay?: boolean;
  overlayBackground?: string;
  overlayLink?: string;
  overlayLogo?: string;
  overlayOpacity?: number;
  overlayPosition?: string;
  overlayText?: string;
  overlayTextColor?: string;
  overlayType?: boolean;
  streaming?: boolean;
  streamingType: "hls" | "dash";
  brandColor?: string;
  name?: string;
  skin: SkinType;
}

/* ------------------------------------------------------------------ */
/*  Component prop helpers                                            */
/* ------------------------------------------------------------------ */

/** Standard WordPress `BlockEditProps`-style interface. */
export interface EditProps {
  attributes: BlockAttributes;
  setAttributes: (attrs: Partial<BlockAttributes>) => void;
  isSelected: boolean;
  clientId: string;
  name: string;
}

/** Configuration object passed to the unified EditBlock component. */
export interface ProviderConfig {
  /** URL validator function. Returns `true` when the URL is valid. */
  validator: (url: string | undefined) => boolean;
  /** Whether to show the <MediaUpload> (self-hosted only). */
  hasMediaUpload?: boolean;
  /** Placeholder text for the URL input. */
  placeholderText?: string;
  blockName?: string;
  icon?: IconType
}

/** Shared props passed into most BSettings sub-components. */
export interface SettingsTabProps {
  setOpen: (open: boolean) => void;
  attributes: BlockAttributes;
  setAttributes: (attrs: Partial<BlockAttributes>) => void;
  updateFeatures: (value: Record<string, unknown>, type?: string | null) => void;
  handleFeatures: (value: Record<string, unknown>, type?: string | null) => void;
}


export type PresetProps = {
  id: number | string;
  settings: string;
  name: string;
  icon?: React.ReactNode
} | null