
import { produce } from "immer";
import { EventEmitter } from "bp-utils";
import { Features, QualityItem, CaptionItem, PlayerConstructorOptions, DeferredEvent, SourceInfo, TrackInfo } from "src/interfaces/MyPlayerInterface";
import { isIOS } from "src/utils/isIOS";


// ────────────────────────────────────────────────────────────────
// hls.js on demand
// ────────────────────────────────────────────────────────────────
let hlsLibPromise: Promise<any> | null = null;

const loadHlsLib = (): Promise<any> => {
  if (window.Hls) return Promise.resolve(window.Hls);
  if (hlsLibPromise) return hlsLibPromise;

  const hasMse =
    typeof window.MediaSource !== "undefined" || typeof (window as any).ManagedMediaSource !== "undefined";

  const url = window.h5vpBlock?.hlsUrl;

  if (!hasMse || !url) return Promise.resolve(null);

  hlsLibPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve(window.Hls || null);
    script.onerror = () => {
      // Let a later source change retry rather than caching the failure.
      hlsLibPromise = null;
      console.warn("MyPlayer: failed to load hls.js from", url);
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return hlsLibPromise;
};

/** Caption items → <track> descriptors ("Label/lang" labels; the first track is the default). */
export const buildCaptionTracks = (captions: CaptionItem[] | null | undefined): TrackInfo[] => {
  if (!Array.isArray(captions)) return [];
  return captions
    .map((item, index) => {
      if (!item || !item.caption_file) return null;
      const labelRaw = (item.label || "English/en").trim();
      const parts = labelRaw.split("/");
      const label = parts[0]?.trim() || "English";
      const srclang = parts[1]?.trim() || (label.length === 2 ? label.toLowerCase() : "en");
      return {
        kind: "captions",
        label,
        srclang,
        src: item.caption_file,
        default: index === 0,
      };
    })
    .filter(Boolean) as TrackInfo[];
};

// ────────────────────────────────────────────────────────────────
// MyPlayer Class
// ────────────────────────────────────────────────────────────────

class MyPlayer extends EventEmitter {
  media: HTMLVideoElement;
  poster: string;
  initialized: boolean;
  streamLoaded: boolean;

  isBackend: boolean;
  features: Features;
  container: HTMLElement | null;
  iconUrl: string;
  onEvents: DeferredEvent[];
  provider: string;
  options: any;
  local: any;
  videoId: number;
  player: any;
  disabled: boolean;
  nonce: string;
  captions: CaptionItem[];
  qualities?: QualityItem[];
  touchClientX: number;
  touchClientY: number;
  skin: string;
  uniqueId: string;
  source: string;
  /** Start once Plyr is ready (thumbnail clicked) without Plyr's autoplay URL flag. */
  playOnReady: boolean;
  hls?: any;
  private seekFixBound = false;
  private globalKeydown: ((e: KeyboardEvent) => void) | null = null;

  constructor(media: HTMLVideoElement, attributes: any, config: PlayerConstructorOptions) {
    super();

    const { isBackend, qualities, provider } = config;


    // Core state
    this.media = media;
    this.poster = attributes.poster || "";
    this.initialized = false;
    this.streamLoaded = false;
    this.hls = null;

    this.isBackend = isBackend;
    this.features = attributes.features;
    this.provider = provider;
    this.videoId = attributes.video_id;
    this.disabled = false;
    this.captions = attributes.subtitle;
    this.qualities = qualities;
    this.nonce = window.h5vpAdmin?.nonce || "";
    this.touchClientX = 0;
    this.touchClientY = 0;
    this.skin = 'default'
    this.uniqueId = attributes.uniqueId;
    this.source = attributes.source;
    this.playOnReady = !this.isBackend && !!attributes.playOnReady;

    // DOM references
    this.container = this.media.closest(".wp-block-html5-player-video") as HTMLElement;
    this.iconUrl = window.h5vpBlock?.plugin_url ? `${window.h5vpBlock.plugin_url}img/plyr.svg` : "";
    this.onEvents = [];
    this.local = window.h5vpBlock || {};

    // Build normalized options
    this.options = this.buildOptions(attributes.options);

    // Validate Plyr is available
    if (typeof window.Plyr === "undefined") {
      console.warn("Plyr is not defined. Please make sure Plyr library is loaded.");
      this.media.setAttribute("controls", "true");
      this.applyPreload();
    }

    // Defer player creation (fixes Vimeo race condition)
    // setTimeout(() => this.createPlayer(), 500);
    this.createPlayer()
  }

  // ──────────────────────────────────────────────────────────────
  // Options Building
  // ──────────────────────────────────────────────────────────────

  /**
   * Consolidates all option normalization into a single pass.
   * Replaces the original 5 separate `produce()` calls.
   */
  private buildOptions(raw: any): any {
    const wrapperWidth = (this.media.closest(".plyr_wrapper") as HTMLElement)?.offsetWidth ?? Infinity;

    return produce(raw, (draft: any) => {
      // Markers
      if (draft.markers) {
        draft.markers.enabled = true;
      }

      // Speed options
      if (raw.speed?.options?.[0]) {
        draft.speed.options = raw.speed.options.map((v: any) => parseFloat(v));
      } else {
        draft.speed = { options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] };
      }

      // Fullscreen
      draft.fullscreen = { container: ".plyr_wrapper", iosNative: true };

      // Autoplay — disabled when playWhenVisible is on, or on frontend
      draft.autoplay = this.isBackend ? false : raw.autoplay;

      // Aspect ratio
      draft.ratio = raw.ratio?.includes(":") ? raw.ratio : null;
      // if (!raw.ratio?.includes(":")) {
      //   draft.ratio = "16:9";
      // }

      // Icon URL
      if (this.iconUrl) {
        draft.iconUrl = this.iconUrl;
      }

      // Plyr swaps in a blank video to cancel requests on source change/destroy; serve it locally instead of from cdn.plyr.io.
      if (this.local?.plugin_url) {
        draft.blankVideo = `${this.local.plugin_url}public/media/blank.mp4`;
      }

      // Download URL
      if (!raw.urls?.enabled) {
        draft.urls = { download: null };
      }

      // Strip controls on narrow containers
      if (wrapperWidth <= 425) {
        draft.controls = (raw.controls || []).filter(
          (c: string) => !["fast-forward", "restart", "rewind"].includes(c)
        );
      }

      // Volume / mute / storage
      if (raw.muted) {
        draft.volume = 0;
        draft.storage = { enabled: false };
      } else {
        draft.volume = 0.5;
        draft.storage = { enabled: true };
      }

    });
  }

  /**
   * Checks if a source URL is an HLS (.m3u8) stream.
   */
  private isHlsSource(url?: string): boolean {
    if (!url) return false;
    const cleanUrl = url.split("?")[0].toLowerCase();
    return cleanUrl.endsWith(".m3u8") || url.includes(".m3u8");
  }

  /**
   * Handles HLS quality level switching.
   */
  private onHlsQualityChange(newQuality: number): void {
    if (!this.hls) return;
    if (newQuality === 0) {
      this.hls.currentLevel = -1; // -1 = Auto
    } else {
      const levelIndex = this.hls.levels?.findIndex((level: any) => level.height === newQuality);
      if (levelIndex !== -1 && typeof levelIndex === "number") {
        this.hls.currentLevel = levelIndex;
      }
    }
  }

  /**
   * Sets up Hls.js instance on this.media for HLS streaming.
   */
  private setupHls(src: string): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (window.Hls) {
      this.attachHls(src);
      return;
    }

    loadHlsLib().then(() => {
      // setSource() may have moved us onto a different video while the library
      // was in flight; that call owns the player now.
      if (this.source === src) {
        this.attachHls(src);
      }
    });
  }

  /**
   * Wires hls.js (or native HLS) to this.media for `src`.
   */
  private attachHls(src: string): void {
    const Hls = window.Hls;

    if (typeof Hls !== "undefined" && Hls.isSupported && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
      });
      this.hls = hls;

      hls.loadSource(src);
      hls.attachMedia(this.media);

      const manifestEvent = Hls.Events?.MANIFEST_PARSED || "hlsManifestParsed";
      const levelSwitchedEvent = Hls.Events?.LEVEL_SWITCHED || "hlsLevelSwitched";
      const errorEvent = Hls.Events?.ERROR || "hlsError";

      hls.on(manifestEvent, () => {
        if (!this.hls) return;
        const availableQualities = (this.hls.levels || [])
          .map((l: any) => l.height)
          .filter(Boolean);

        if (availableQualities.length > 0 && this.player) {
          const uniqueQualities = [0, ...Array.from(new Set(availableQualities)).sort((a: any, b: any) => b - a)];

          this.player.options.quality = {
            default: 0,
            options: uniqueQualities,
            forced: true,
            onChange: (quality: number) => this.onHlsQualityChange(quality),
          };

          this.player.options.i18n = {
            ...(this.player.options.i18n || {}),
            qualityLabel: {
              0: "Auto",
            },
          };

          if (typeof (this.player as any).setQualityMenu === "function") {
            (this.player as any).setQualityMenu(uniqueQualities);
          }
        }
      });

      hls.on(levelSwitchedEvent, (_event: any, data: any) => {
        const span = this.container?.querySelector(".plyr__menu__container [data-plyr='quality'][value='0'] span");
        if (span && this.hls) {
          if (this.hls.autoLevelEnabled) {
            const currentLevel = this.hls.levels?.[data.level];
            span.textContent = currentLevel ? `Auto (${currentLevel.height}p)` : "Auto";
          } else {
            span.textContent = "Auto";
          }
        }
      });

      hls.on(errorEvent, (_event: any, data: any) => {
        if (data.fatal && this.hls) {
          const errorTypes = Hls.ErrorTypes || {};
          switch (data.type) {
            case errorTypes.NETWORK_ERROR:
              console.warn("HLS network error, attempting recovery...");
              this.hls.startLoad();
              break;
            case errorTypes.MEDIA_ERROR:
              console.warn("HLS media error, attempting recovery...");
              this.hls.recoverMediaError();
              break;
            default:
              console.warn("Fatal HLS error, destroying HLS instance...");
              this.hls.destroy();
              this.hls = null;
              break;
          }
        }
      });
    } else if (
      this.media.canPlayType("application/vnd.apple.mpegurl") ||
      this.media.canPlayType("application/x-mpegURL")
    ) {
      // Native HLS for Safari
      this.media.src = src;
    }
  }

  /**
   * Instantiates the Plyr player based on source type and wires initial events.
   */
  private createPlayer(): void {
    const isHls = this.isHlsSource(this.source);
    if (isHls && this.source) {
      this.setupHls(this.source);
    }

    const plyrOpts = { ...this.options, i18n: window.h5vpI18n || {} };

    // iOS native fullscreen only works on a <video>; for YouTube, Plyr also turns iosNative into
    // playsinline=0, which forces iPhone playback into fullscreen. YouTube plays inline and uses
    // Plyr's full-window fallback for its fullscreen button instead.
    const isYouTubeMedia =
      !!this.media?.classList?.contains("player_youtube") ||
      /youtube(-nocookie)?\.com\/embed/.test(this.media?.querySelector?.("iframe")?.src || "");
    if (isYouTubeMedia && plyrOpts.fullscreen) {
      plyrOpts.fullscreen = { ...plyrOpts.fullscreen, iosNative: false };
    }

    // Plyr only ever *adds* the playsinline attribute, so hardcoding true here
    const playsinline = this.options?.playsinline !== false;

    this.player = new window.Plyr(this.media, { ...plyrOpts, playsinline });
    // Plyr has wrapped the <video> by now, so loading can start without being restarted by the move.
    this.applyPreload();
    this.keepNativeCaptionsHidden();
    this.player.on("ready", () => this.onReady());
    this.player.on("loadedmetadata", () => {
      if (!this.initialized) {
        this.init();
      }
    });

    this.wireGlobalEvents();
  }

  /**
   * Attaches global events that apply regardless of source type:
   * disable-pause, instance tracking, progress bar fix, mute toggle, poster, source updates.
   */
  private wireGlobalEvents(): void {

    // Global instance tracking
    if (!window.instance) {
      window.instance = [];
    }
    window.instance.push(this.player);

    // Progress bar fallback — update manually if Plyr doesn't. Bound at most once: every play
    // event used to stack another timeupdate listener.
    this.player?.on("play", () => {
      setTimeout(() => {
        if (!this.player) return;
        const seekInput = this.player?.elements?.inputs?.seek;
        if (seekInput && seekInput.value <= 0 && !this.seekFixBound) {
          this.seekFixBound = true;
          this.player.on("timeupdate", () => {
            if (!this.player) return;
            const pct = (100 / (this.player.duration || 1)) * (this.player.currentTime || 0);
            if (seekInput) {
              seekInput.setAttribute("style", `--value:${pct}%`);
              seekInput.value = pct;
            }
          });
        }
      }, 3000);

      // Pause in admin context
      if (this.isBackend) {
        this.player.pause();
      }

      // "Play one player at a time" setting — pause every other instance on the page.
      if (this.local?.pauseOther) {
        window.instance?.forEach((p: any) => {
          if (p && p !== this.player && p.playing) {
            p.pause();
          }
        });
      }
    });

    // "Reset On End" setting — seek back to the start once playback finishes.
    this.player?.on("ended", () => {
      if (this.options?.resetOnEnd) {
        this.player.currentTime = 0;
      }
    });

    // Unmute toggle — bump volume to 40% when unmuting from zero
    this.player?.elements?.buttons?.mute?.addEventListener("click", () => {
      if (this.player.volume === 0) {
        this.player.volume = 0.4;
      }
    });

    // Source update event
    this.addEventListener("update-source", ({ data }: { data: { source: string; qualities: string[]; captions: any } }) => {
      this.setSource(data.source, data.qualities, data.captions);
    });

    // Re-apply poster after ready
    this.player?.on("ready", () => {
      setTimeout(() => {
        // setPoster() rather than cssText, which would wipe any other inline
        // style Plyr has put on the poster element.
        this.setPoster(this.poster);
      }, 500);
    });
  }

  /**
   * Fires when the Plyr player emits "ready".
   */
  onReady(): void {
    // Remove the temporary aspect-ratio from the block container
    const blockContainer = this.player?.elements?.wrapper?.closest(".wp-block-html5-player-video");
    if (blockContainer) {
      blockContainer.style.aspectRatio = "";
    }

    // YouTube/Vimeo never fire loadedmetadata before playback, so init() hasn't run for them yet.
    this.letIosTapReachYouTube();
    this.syncVimeoMutedState();
    // The visitor pressed play on the YouTube/Vimeo thumbnail. Started here rather than through Plyr's
    // autoplay option, which becomes autoplay=1 in the embed URL — a Vimeo embed loaded that way plays muted on iOS.
    if (this.playOnReady) {
      this.player?.play()?.catch?.(() => {});
    }


    // Flush deferred event listeners
    if (this.onEvents.length > 0) {
      this.onEvents.forEach(({ eventName, callback }) => {
        this.player.on(eventName, callback);
      });
      this.onEvents = [];
    }


    // Space-key play/pause (Plyr default doesn't always work)
    this.player?.elements?.container?.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        this.player.playing ? this.player.pause() : this.player.play();
      }
    });

    // Premium client: global space-key toggle
    if (window.location.host.includes("dvrg") && !this.globalKeydown) {
      this.globalKeydown = (e: KeyboardEvent) => {
        if (e.key === " " && this.player) {
          this.player.playing ? this.player.pause() : this.player.play();
        }
      };
      window.document.addEventListener("keydown", this.globalKeydown);
    }




  }

  // ──────────────────────────────────────────────────────────────
  // Init & Source Management
  // ──────────────────────────────────────────────────────────────

  /**
   * Full initialization: sets sources, tracks, and activates all features.
   */
  init(): void {
    if (!this.player) {
      console.warn("MyPlayer: player not available during init.");
      return;
    }
    this.initialized = true;

    const isHls = this.isHlsSource(this.source);

    let sourceSwapped = false;
    if (!isHls) {
      const sources = this.buildSources(this.qualities || [], this.source);
      // Re-assigning player.source makes Plyr cancel the in-flight load (fetching a blank video),
      // tear the media down and download the same file again, and drops the element's preload
      // attribute. Only do it when the <video> doesn't already carry exactly these sources.
      if (!this.mediaHasSources(sources)) {
        this.player.source = {
          type: "video",
          sources,
          poster: this.player.poster && this.player.poster !== "false" ? this.player.poster : "",
        };
        sourceSwapped = true;
      }
    } else {
      if (this.poster) {
        this.setPoster(this.poster);
      }
    }

    // The <video> is rendered with its <track>s already in place; they only need adding when the
    // source swap above rebuilt the element or the markup came without them.
    if (sourceSwapped || !this.media.querySelector("track")) {
      const tracks = this.buildTracks(this.captions);
      this.appendTracks(tracks);
    }

    setTimeout(() => {
      if (!this.options.urls?.enabled && this.player.source) {
        this.player.download = this.player.source;
      }
    }, 50);

    // The source swap above gives Plyr a new <video>, with its own text tracks.
    if (sourceSwapped) this.keepNativeCaptionsHidden();

    // Block playback in wp-admin
    this.player.on("play", () => {
      if (window.location.pathname.includes("/wp-admin")) {
        this.player.pause();
        this.player.currentTime = 0;
      }
    });

    // Activate all features
    this.exitPipOnFullscreen();
    if (typeof this.features === "object") {
      this.landScapeWhenFullscreen();
    }

    // Disable playback when watermark is loading
    this.player.on("play", () => {
      if (this.disabled) {
        this.player.currentTime = 0;
        this.player.pause();
      }
    });

    // Post-ready setup
    this.player.on("ready", () => {
      // Start time


      // Autoplay on frontend
      if (this.options.autoplay) {
        this.player?.play()?.catch?.((err: any) => {
          console.warn("Autoplay was blocked by browser policies. Video will load paused until user interaction.", err);
        });
      }

      this.controlTouchAction();

      // Small progress bar — move controls up
      const progressWidth = this.player.elements?.progress?.offsetWidth;
      if (progressWidth < 50) {
        this.player.elements?.container?.classList?.add("h5vp_progressbar_up");
      }
    });
  }

  reInit(): void {
    this.init();
  }

  /**
   * Plyr draws captions itself and toggles them with its CC button, so the browser's own caption
   * rendering has to stay off. iOS re-enables a track on its own (default track, accessibility
   * caption settings), which showed captions whether CC was on or off. iOS's native fullscreen
   * player is left alone: there the viewer picks captions from its own menu.
   */
  private keepNativeCaptionsHidden(): void {
    const media = (this.player?.media || this.media) as HTMLVideoElement & { webkitDisplayingFullscreen?: boolean };
    const tracks = media?.textTracks;
    if (!tracks || typeof tracks.addEventListener !== "function") return;

    const hide = () => {
      if (media.webkitDisplayingFullscreen) return;
      Array.from(tracks).forEach((track) => {
        if (track.mode === "showing") track.mode = "hidden";
      });
    };
    tracks.addEventListener("change", hide);
    tracks.addEventListener("addtrack", hide);
    hide();
  }

  /**
   * When a browser won't let Vimeo start with sound (iOS, a start without a fresh tap), Vimeo plays
   * muted instead and doesn't tell Plyr, whose volume icon then claims sound is on. Show the real state,
   * so one tap on the volume button brings the sound back.
   */
  private syncVimeoMutedState(): void {
    if (this.isBackend || !this.player?.isVimeo) return;
    this.player.on("playing", () => {
      const embed = this.player?.embed;
      if (!embed || typeof embed.getMuted !== "function") return;
      Promise.resolve(embed.getMuted())
        .then((muted: boolean) => {
          if (muted && !this.player.muted) this.player.muted = true;
        })
        .catch(() => {});
    });
  }

  /**
   * On iPhone/iPad YouTube refuses to start from script (autoplay or playVideo()): the first tap has
   * to land on YouTube's own player. Until playback starts, Plyr's big play button and poster —
   * which sit on top of the iframe — are hidden, so that tap reaches YouTube.
   */
  private letIosTapReachYouTube(): void {
    if (this.isBackend || !this.player?.isYouTube || !isIOS()) return;
    const container = this.player.elements?.container as HTMLElement | undefined;
    if (!container) return;
    container.classList.add("h5vp-tap-through");
    // Plyr pauses YouTube again when it starts before Plyr itself ever played it ("restore paused
    // state" in its YouTube plugin), which would undo exactly that tap.
    if (this.player.embed) this.player.embed.hasPlayed = true;
    this.player.once("playing", () => container.classList.remove("h5vp-tap-through"));
  }

  /**
   * Replace the player's source, qualities, and captions at runtime.
   */
  setSource(source: string = "", qualities: any[] = [], captions: any[] = []): void {
    const nextSource = source || this.source;
    this.source = nextSource;
    qualities = qualities || this.qualities;
    const tracks = this.buildTracks(captions && captions.length ? captions : this.captions);

    if (this.isHlsSource(nextSource)) {
      this.setupHls(nextSource);
      if (this.poster) {
        this.setPoster(this.poster);
      }
    } else {
      if (this.hls) {
        this.hls.destroy();
        this.hls = null;
      }
      const sources = this.buildSources(qualities, nextSource || this.player?.source);
      if (this.player) {
        this.player.source = {
          type: "video",
          title: "",
          sources,
          poster: this.player.poster && this.player.poster !== "false" ? this.player.poster : "",
        };
      }
    }

    this.appendTracks(tracks);
  }

  updateCaptions(): void {
    const tracks = this.buildTracks(this.captions);
    this.appendTracks(tracks);
  }

  setPoster(poster: string): void {
    if (this.player?.elements?.poster && poster) {
      this.player.elements.poster.style.backgroundImage = `url(${poster})`;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Source & Track Helpers (DRY)
  // ──────────────────────────────────────────────────────────────

  /**
   * Builds a normalized sources array from quality items + a fallback source.
   */
  private buildSources(qualities: QualityItem[] | null, fallbackSrc?: string): SourceInfo[] {
    const sources: SourceInfo[] =
      qualities
        ?.map((item) => ({
          type: this.getVideoMimeType(item?.video_file),
          size: parseInt(item.size as string),
          src: item.video_file,
        }))
        .filter((item) => item.src) || [];

    if (fallbackSrc) {
      sources.push({ src: fallbackSrc, type: this.getVideoMimeType(fallbackSrc), size: 720 });
    }

    return sources;
  }

  /** Apply the player's real preload, held back in data-h5vp-preload until the element is in its final place (see Video.tsx). */
  private applyPreload(): void {
    const preload = this.media?.dataset?.h5vpPreload;
    if (preload && this.media.getAttribute("preload") !== preload) {
      this.media.setAttribute("preload", preload);
    }
  }

  /** True when the media element already holds exactly these sources (order-independent). */
  private mediaHasSources(sources: SourceInfo[]): boolean {
    const toAbsolute = (url: string) => {
      try {
        return new URL(url, window.location.href).href;
      } catch {
        return url;
      }
    };
    const current = Array.from(this.media.querySelectorAll("source")).map((el) => el.src);
    if (!current.length || current.length !== sources.length) return false;
    return sources.every((item) => current.includes(toAbsolute(item.src)));
  }

  /**
   * Builds track metadata from caption items.
   */
  private buildTracks(captions: CaptionItem[] | null): TrackInfo[] {
    return buildCaptionTracks(captions);
  }

  /**
   * Appends <track> elements to the player's media element.
   */
  private appendTracks(tracks: TrackInfo[]): void {
    tracks.forEach((track) => {
      if (track?.src) {
        const el = document.createElement("track");
        Object.assign(el, track);
        this.player.media.appendChild(el);
      }
    });
  }

  /**
   * Extracts the file extension from a path or URL.
   */
  private getFileExtension(path: string | undefined): string {
    if (!path) return "";
    return path.split(".").pop() || "";
  }

  private getVideoMimeType(path: string | undefined): string {
    if (!path) return "video/mp4";
    const ext = this.getFileExtension(path) as keyof typeof mimeTypes;
    const mimeTypes = {
      mp4: "video/mp4",
      m3u8: "application/x-mpegURL",
      mpd: "application/dash+xml",
      flv: "video/x-flv",
      mov: "video/mp4", // don't update it
      webm: "video/webm",
      ogv: "video/ogg",
      avi: "video/x-msvideo",
      "3gp": "video/3gpp",
    };

    return mimeTypes[ext] || "video/mp4";

  }


  /**
   * Automatically exits Picture-in-Picture mode when entering fullscreen.
   */
  private exitPipOnFullscreen(): void {
    this.player?.on("enterfullscreen", () => {
      // Standard W3C Picture-in-Picture API
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => { });
      }
      // WebKit / Safari presentation mode
      if ((this.media as any)?.webkitPresentationMode === "picture-in-picture") {
        (this.media as any)?.webkitSetPresentationMode?.("inline");
      }
      // Plyr PiP controller state
      if (this.player?.pip?.active) {
        this.player.pip.active = false;
      }
    });
  }

  /**
   * Locks screen orientation to landscape when entering fullscreen on mobile.
   */
  private landScapeWhenFullscreen(): void {
    if ((window?.innerWidth ?? Infinity) >= 992) return;

    this.player.on("enterfullscreen", () => {
      if (!this.player.fullscreen?.active) return;
      (screen?.orientation as any)?.lock?.("landscape")?.catch?.(() => { });
    });

    this.player.on("exitfullscreen", () => {
      // Only unlock when nothing on the page is in fullscreen.
      // Plyr fires exitfullscreen on OTHER player instances whenever ANY
      // player enters fullscreen (they detect they're not the fullscreen
      // element). Without this guard those handlers call unlock() and
      // immediately revert the landscape orientation.
      if (document.fullscreenElement) return;
      (screen?.orientation as any)?.unlock?.();
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Touch Controls
  // ──────────────────────────────────────────────────────────────

  /**
   * Enables swipe-to-seek and double-tap-to-seek on mobile/tablet in fullscreen.
   */
  private controlTouchAction(): void {
    if (document.body.offsetWidth > 992) return;

    const wrapper = this.player.elements?.container;
    if (!wrapper) return;

    const videoWrapper = wrapper.querySelector(".plyr__video-wrapper");
    const seekLabel = document.createElement("span");
    seekLabel.classList.add("seekSecond");
    videoWrapper.appendChild(seekLabel);

    // Remove Plyr's default double-click-to-fullscreen
    this.player.eventListeners.forEach(
      (evt: { type: string; callback: EventListenerOrEventListenerObject; options: boolean | AddEventListenerOptions }) => {
        if (evt.type === "dblclick") {
          wrapper.removeEventListener(evt.type, evt.callback, evt.options);
        }
      }
    );

    // Double-tap: seek or toggle fullscreen
    videoWrapper.parentNode.addEventListener("dblclick", (e: MouseEvent) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;

      if (this.player.fullscreen.active) {
        if (videoWrapper.offsetWidth - 150 < x && videoWrapper.offsetWidth / 2 < x) {
          this.player.forward(this.options.seekTime);
          seekLabel.innerText = `${this.options.seekTime} sec`;
        } else if (videoWrapper.offsetWidth / 2 > x && x < 150) {
          this.player.rewind(this.options.seekTime);
          seekLabel.innerText = `-${this.options.seekTime} sec`;
        }
        setTimeout(() => { seekLabel.innerText = ""; }, 1000);
      }

      if (x > 150 && x < videoWrapper.offsetWidth - 150) {
        this.player.fullscreen.toggle();
      }
    });

    // Swipe to seek
    wrapper.addEventListener("touchstart", (e: TouchEvent) => {
      if (!this.player.fullscreen.active) return;
      this.touchClientX = e.touches[0].clientX;
      this.touchClientY = e.touches[0].clientY;
    }, { passive: true });

    wrapper.addEventListener("touchend", (e: TouchEvent) => {
      if (!this.player.fullscreen.active) return;
      const deltaX = e.changedTouches[0].clientX - this.touchClientX;

      if (deltaX > 5) {
        this.player.forward(deltaX / 10);
        seekLabel.innerText = `${deltaX / 10} sec`;
      } else if (deltaX < -5) {
        this.player.rewind(Math.abs(deltaX) / 10);
        seekLabel.innerText = `${deltaX / 10} sec`;
      }

      setTimeout(() => { seekLabel.innerText = ""; }, 1000);
    }, { passive: true });
  }


  destroy(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.globalKeydown) {
      window.document.removeEventListener("keydown", this.globalKeydown);
      this.globalKeydown = null;
    }
    // Drop the instance from the shared registry so the dead Plyr can be garbage-collected.
    if (Array.isArray(window.instance)) {
      const index = window.instance.indexOf(this.player);
      if (index !== -1) window.instance.splice(index, 1);
    }
    this.player?.destroy();
  }

  stop(): void {
    this.player?.stop();
  }

  on(eventName: string, callback: (...args: any[]) => void): void {
    if (this.player?.ready) {
      this.player.on(eventName, callback);
    } else {
      this.onEvents.push({ eventName, callback });
    }
  }


  setNonce(nonce: string): void {
    this.nonce = nonce;
  }

  setVideoId(videoId: string | number): void {
    this.videoId = videoId as number;
  }



  /**
   * Attaches a click event listener to an element, with a null check.
   */
  private onClick(element: HTMLElement | null, callback: () => void): void {
    element?.addEventListener("click", callback);
  }

  /**
   * Converts a DOM element's attributes to an array of key-value objects.
   */
  domAttributesToObjectList(elements: NodeListOf<Element>): Record<string, string>[] {
    return Array.from(elements).map((el) => {
      const result: Record<string, string> = {};
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        result[attr.name] = attr.value;
      }
      return result;
    });
  }

  getStoredSettings(): any {
    return JSON.parse(window.localStorage.getItem("plyr")!);
  }

  /**
   * Returns a throttled version of the given function.
   */
  private throttle(fn: (...args: any[]) => void, wait: number): (...args: any[]) => void {
    let last = 0;
    return (...args: any[]) => {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn(...args);
      }
    };
  }

  private play() {
    this.player.play();
  }

  private pause() {
    this.player.pause();
  }
  private ended(fn: () => void) {
    this.player.on('ended', fn);
  }
}



// ────────────────────────────────────────────────────────────────
// Standalone Exports
// ────────────────────────────────────────────────────────────────

export const extractFileNamesWithoutExtension = (filePath: string): string => {
  const parts = filePath.split("/");
  const fileNameWithExtension = parts[parts.length - 1];
  return fileNameWithExtension.replace(/\.[^/.]+$/, "");
};

export default MyPlayer;
