/**
 * Small player options that sit on top of Plyr: the starting volume and how the video fills its frame.
 *
 * Both are opt-in. A player saved before they existed has neither option, and then nothing here runs, so
 * its behaviour does not change.
 */

/** "Default volume" in percent (0-100) as a number, or null when the option is unset or invalid. */
export const parseDefaultVolume = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const percent = Number(value);
  if (!Number.isFinite(percent)) return null;
  return Math.min(100, Math.max(0, Math.round(percent)));
};

/** Start the player at the configured volume. A muted player stays muted: "Muted" always wins. */
export const applyDefaultVolume = (player: any, options: any): void => {
  const percent = parseDefaultVolume(options?.defaultVolume);
  if (percent === null || !player || options?.muted) return;

  // Plyr saves every volume change as the visitor's own preference and gives it to every player on the site.
  // Setting the owner's start volume must not become that preference, so saving is paused until Plyr has
  // reported this one change (a YouTube/Vimeo player reports it late, hence the long fallback).
  const storage = player.storage;
  const storageWasOn = !!storage && storage.enabled !== false;

  const set = () => {
    let watching = true;
    const resume = () => {
      if (!watching) return;
      watching = false;
      player.off?.("volumechange", resume);
      if (storage && storageWasOn) storage.enabled = true;
    };
    if (storage && storageWasOn) storage.enabled = false;
    player.on?.("volumechange", resume);
    setTimeout(resume, 20000);

    try {
      player.volume = percent / 100;
    } catch (e) {
      /* the provider is not ready yet */
    }
    // Already at this volume: no change event will come.
    if (Math.abs((player.volume ?? -1) - percent / 100) < 0.011 && !player.isEmbed) setTimeout(resume, 300);
  };
  set();
  // Plyr restores the visitor's last volume from storage when it is ready; the owner's setting is the start volume.
  player.once?.("ready", set);
};

/** A YouTube/Vimeo frame is 16:9; this is the scale that makes it fill a frame of another shape. */
const coverScale = (width: number, height: number, mediaRatio = 16 / 9): number => {
  if (!width || !height) return 1;
  const frameRatio = width / height;
  return Math.max(frameRatio / mediaRatio, mediaRatio / frameRatio);
};

/**
 * "Fill (crop)": the video covers the whole frame and the overflow is cropped, instead of black bars.
 * It only has an effect when the frame has a fixed ratio (Video Ratio); with "Original" the frame
 * already matches the video.
 */
export const applyFit = (player: any, options: any): void => {
  const container: HTMLElement | undefined = player?.elements?.container;
  if (!container || options?.fit !== "cover") return;

  // Called again when a player is rebuilt: apply once.
  if (container.classList.contains("h5vp-fit-cover")) return;

  container.classList.add("h5vp-fit-cover");

  if (!player.isEmbed) return;

  const update = () => {
    container.style.setProperty("--h5vp-fit-scale", String(coverScale(container.clientWidth, container.clientHeight)));
  };
  update();
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(update);
    observer.observe(container);
    player.on?.("destroyed", () => observer.disconnect());
  }
};
