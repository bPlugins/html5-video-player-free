// render.php reserves the player's box (.h5vp-reserving-space) so the page doesn't shift while the
// player loads. Once the player can size itself (metadata, or an embed Plyr has wrapped), hand the
// sizing back by dropping the reservation.

const RESERVING = "h5vp-reserving-space";
const WATCHED = "h5vpReservedSpace";

const SIGNALS = ["loadedmetadata", "loadeddata", "canplay", "durationchange", "resize", "error"];

function canRelease(container: HTMLElement): boolean {
  // Plyr applies its own ratio to embeds, so they never need the reservation.
  if (container.querySelector(".plyr--youtube, .plyr--vimeo")) return true;

  const video = container.querySelector("video");
  if (!video) return false;
  return !!video.error || video.readyState >= HTMLMediaElement.HAVE_METADATA;
}

function check(container: HTMLElement): boolean {
  if (!container.classList.contains(RESERVING)) return true;
  if (!canRelease(container)) return false;

  container.classList.remove(RESERVING, "h5vp-reserving-fixed");
  return true;
}

/** Release one container's reservation as soon as its mounted player can size itself. */
export function watchReservedSpace(container: HTMLElement): void {
  if (container.dataset[WATCHED]) return;
  container.dataset[WATCHED] = "1";

  if (check(container)) return;

  const listeners: Array<() => void> = [];
  const onSignal = () => {
    if (check(container)) stop();
  };
  for (const event of SIGNALS) {
    container.addEventListener(event, onSignal, true);
    listeners.push(() => container.removeEventListener(event, onSignal, true));
  }

  const observer = new MutationObserver(onSignal);
  observer.observe(container, { childList: true, subtree: true });

  function stop() {
    observer.disconnect();
    listeners.forEach((off) => off());
    delete container.dataset[WATCHED];
  }
}
