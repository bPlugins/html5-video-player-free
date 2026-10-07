
// ────────────────────────────────────────────────────────────────
// Types & Interfaces
// ────────────────────────────────────────────────────────────────

export interface StickyConfig {
    enabled: boolean;
    position: string;
}

export interface WatermarkConfig {
    enabled: boolean;
    type: string;
    text: string;
    color: string;
}

export interface ThumbInPauseConfig {
    enabled: boolean;
    type?: string;
}

export interface PopupConfig {
    enabled: boolean;
    hasBtn?: boolean;
    selector?: string;
    type?: string;
    align?: string;
    btnText?: string;
    btnStyle?: Record<string, any>;
    isTrigger?: boolean;
}

export interface PasswordProtectedConfig {
    enabled: boolean;
    heading?: string;
    button?: { text?: string };
    key?: string;
    errorMessage?: string;
}

export interface EndScreenConfig {
    enabled: boolean;
    text?: string;
    btnText?: string;
    btnLink?: string;
}

export interface OverlayItem {
    type: 'text' | 'image' | 'logo';
    text?: string;
    logo?: string;
    link?: string;
    position: string;
    color?: string;
    fontSize?: string;
    backgroundColor?: string;
    opacity?: number;
    hoverColor?: string;
}

export interface OverlayConfig {
    enabled: boolean;
    items: OverlayItem[];
}

export interface Features {
    sticky?: StickyConfig;
    watermark?: WatermarkConfig;
    thumbInPause?: ThumbInPauseConfig;
    popup: PopupConfig;
    passwordProtected?: PasswordProtectedConfig;
    overlay: OverlayConfig;
    endScreen: EndScreenConfig;
    playWhenVisible?: boolean;
    disablePause?: boolean;
    startTime?: string;
    saveState?: boolean;
    customPlayButtonSelector?: string;
    hideYoutubeUI?: boolean;
    [key: string]: any;
}

export interface QualityItem {
    video_file: string;
    size: string | number;
    src?: string;
}

export interface CaptionItem {
    label: string;
    caption_file: string;
}

export interface TrackInfo {
    kind: string;
    label: string;
    srclang: string;
    src: string;
    default?: boolean;
}

export interface SourceInfo {
    type: string;
    size: number;
    src: string;
}

export interface ChapterPoint {
    label?: string;
    name?: string;
    time: string;
}

export interface DeferredEvent {
    eventName: string;
    callback: (...args: any[]) => void;
}

export interface PlayerConstructorOptions {
    isBackend: boolean;
    qualities?: QualityItem[];
    provider: string;
}

// ────────────────────────────────────────────────────────────────
// VideoPlayer Component Types
// ────────────────────────────────────────────────────────────────

export interface StylesMap {
    [selector: string]: Record<string, string>;
}

export interface PlayerOptions {
    autoplay?: boolean;
    muted?: boolean;
    loop?: { active?: boolean };
    preload?: string;
    playsinline?: boolean;
    [key: string]: any;
}

export interface VideoPlayerAttributes {
    /** Set on the front end when the visitor pressed play on a YouTube/Vimeo thumbnail. */
    playOnReady?: boolean;
    additionalCSS?: string;
    additionalID?: string;
    source: string;
    poster?: string;
    provider?: string;
    streaming?: boolean;
    qualities?: QualityItem[];
    quality?: QualityItem[];
    subtitle?: CaptionItem[];
    options: PlayerOptions;
    features: Features;
    uniqueId: string;
    styles?: StylesMap;
    presetId?: number | string
    skin: 'default' | 'modern' | 'stacked' | 'floating-pill' | 'classic-minimal' | 'stacked-dual-row'
}