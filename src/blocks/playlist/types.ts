export type PlaylistProvider = "library" | "youtube" | "vimeo";

export interface PlaylistVideo {
  h5vp_video_provider: PlaylistProvider;
  video_source: string;
  h5vp_video_source: string;
  video_thumb: string;
  video_title: string;
  video_desc: string;
  video_duration?: string;
}

export const EMPTY_VIDEO: PlaylistVideo = {
  h5vp_video_provider: "library",
  video_source: "",
  h5vp_video_source: "",
  video_thumb: "",
  video_title: "",
  video_desc: "",
  video_duration: "",
};

export interface PlaylistBlockAttributes {
  uniqueId?: string;
  videos: PlaylistVideo[];
  playlistType: string;
  autoplayNextVideo: boolean;
  showPrevNext: boolean;
  showSearch: boolean;
  controls: string[];
  brandColor: string;
  playerWidth: string;
}

export interface PlaylistRuntimeOptions {
  controls: string[];
  muted: boolean;
  seekTime: number;
  hideControls: boolean;
  resetOnEnd: boolean;
  autoplayNextVideo: boolean;
  showPrevNext: boolean;
  showSearch: boolean;
}

export interface PlaylistRuntimeData {
  uniqueId: string;
  playlistType: string;
  options: PlaylistRuntimeOptions;
  videos: PlaylistVideo[];
  /** Thumbnail render.php resolved for the first item (Vimeo needs a server lookup), reused by the click-to-load stand-in. */
  placeholderThumb?: string;
  styles: {
    h5vp_playlist_container: {
      width: string;
      maxWidth: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}
