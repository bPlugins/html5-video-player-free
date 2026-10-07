import React, { useRef } from "react";
import { __ } from "@wordpress/i18n";
import { PlaylistVideo } from "src/blocks/playlist/types";
import { useVideoDuration } from "./useVideoDuration";

interface PlaylistItemProps {
  video: PlaylistVideo;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onSelect: (index: number) => void;
  onTogglePlay: () => void;
}

const PlaylistItem: React.FC<PlaylistItemProps> = ({
  video,
  index,
  isActive,
  isPlaying,
  onSelect,
  onTogglePlay,
}) => {
  const isLibrary = video.h5vp_video_provider === "library";
  const sourceUrl = isLibrary ? video.video_source : video.h5vp_video_source;
  const itemRef = useRef<HTMLLIElement>(null);
  // The active item is the one the player is loading, so it reports its own duration; the others
  // are probed one at a time, only once they scroll into view.
  const duration = useVideoDuration(
    sourceUrl,
    video.h5vp_video_provider,
    video.video_duration,
    { ref: itemRef, skip: isActive }
  );

  // Selecting the item that is already loaded cannot re-select anything — the
  // player keeps the same source — so it toggles playback instead. Without this
  // the button showed a pause icon that did nothing but flip the label.
  const activate = () => {
    if (isActive) {
      onTogglePlay();
    } else {
      onSelect(index);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    activate();
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    activate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  };

  const showPauseIcon = isActive && isPlaying;

  return (
    <li
      ref={itemRef}
      className={`h5vp_playlist_item ${isActive ? "active" : ""} ${
        showPauseIcon ? "playing" : ""
      }`}
      data-index={index}
      data-provider={video.h5vp_video_provider}
      data-source={sourceUrl}
      role="option"
      aria-selected={isActive}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className="svg play_pause_svg"
        role="button"
        tabIndex={-1}
        aria-label={
          showPauseIcon
            ? __("Pause", "html5-video-player")
            : __("Play", "html5-video-player")
        }
        onClick={handleToggleClick}
      >
        {showPauseIcon ? (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <polygon points="6,4 20,12 6,20" />
          </svg>
        )}
      </div>

      <div className="video_title">
        <span className="title">
          {video.video_title || `Video ${index + 1}`}
        </span>
      </div>

      {showPauseIcon && (
        <span className="h5vp_playlist_badge__bars h5vp_pl_simple_eq">
          <i />
          <i />
          <i />
        </span>
      )}

      {duration && (
        <span className="h5vp_playlist_badge h5vp_playlist_badge--duration">
          {duration}
        </span>
      )}
    </li>
  );
};

export default PlaylistItem;
