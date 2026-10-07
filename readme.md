# HTML5 Video Player — Fast, Responsive Video Player for WordPress

![HTML5 Video Player Banner](https://ps.w.org/html5-video-player/assets/banner-1544x500.png)

[![WordPress](https://img.shields.io/badge/WordPress-6.5+-blue.svg?style=flat-square&logo=wordpress)](https://wordpress.org/plugins/html5-video-player/)
[![Tested up to](https://img.shields.io/badge/Tested%20up%20to-7.1-blue.svg?style=flat-square&logo=wordpress)](./readme.txt)
[![PHP](https://img.shields.io/badge/PHP-7.4+-777bb4.svg?style=flat-square&logo=php)](./readme.txt)
[![License](https://img.shields.io/badge/License-GPLv2-green.svg?style=flat-square)](./readme.txt)
[![Version](https://img.shields.io/badge/Version-2.14.0-blue.svg?style=flat-square)](./readme.txt)

**HTML5 Video Player** embeds MP4, WebM, OGG, HLS, YouTube and Vimeo videos in one consistent, customizable player built on [Plyr](https://plyr.io/). Add players with Gutenberg blocks, shortcodes, the classic editor or Elementor — no code required. Trusted by 30,000+ websites.

> This file is for developers working on the plugin. The WordPress.org readme — full feature list, FAQ and changelog — is [`readme.txt`](./readme.txt).

---

## 🎬 Video Walkthrough

[![HTML5 Video Player overview](https://img.youtube.com/vi/rOVr8TX5C70/hqdefault.jpg)](https://www.youtube.com/watch?v=rOVr8TX5C70)

<p align="center">
  <a href="https://www.youtube.com/watch?v=58P9jOzn7M4" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/badge/YouTube-Quick%20Start%20Guide-red?style=for-the-badge&logo=youtube" alt="Watch the Quick Start guide on YouTube" />
  </a>
</p>

---

## 🚀 Key Features

### 💎 Free
- **One player for every source** — MP4, WebM, OGG, MOV, HLS (`.m3u8`) with automatic quality levels, YouTube and Vimeo.
- **Six Gutenberg blocks** — Video, YouTube, Vimeo, Video Playlist, Audio Player, and the parent block that lets you pick a source.
- **Video Playlist** — simple list layout, auto-play next with a 5-second "Up Next" countdown, duration badges and custom thumbnails; mix Library, YouTube and Vimeo items.
- **Audio Player** — four skins (Modern Bar, Waveform, Podcast Card, Compact Pill) with speed, 10-second skip, volume and download.
- **Subtitles & captions** — attach a `.vtt` track with your own language label.
- **Playback options** — autoplay, loop, mute, preload (none / metadata / auto), inline playback on iOS.
- **Styling** — skins, brand color, width, border radius and left / center / right alignment.
- **Shortcodes & Elementor** — `[video_player]`, `[html5_video id]`, and an Elementor widget.
- **SEO** — schema markup for every video.
- **Fast by default** — see [Performance](#-performance).

### 👑 Pro
- 6 premium player skins, full color picker and control-level customization
- Advanced playlists (3 extra layouts, live search, prev/next arrows, `[video_playlist]` shortcode)
- Quality switcher, DASH (`.mpd`) streaming and multiple subtitle tracks
- Chapters, overlays, custom end screen, popup and sticky players
- Password protection, user-role restrictions and dynamic watermark
- Email capture (Mailchimp, MailerLite, ActiveCampaign, FluentCRM)
- Video analytics, Google Analytics (GA4) tracking and Google VAST ads

See the [pricing page](https://bplugins.com/products/html5-video-player/pricing/) for the complete Pro list.

---

## ⚡ Performance

Measured with Lighthouse 12 (mobile, simulated slow 4G) on the same pages, before and after version 2.14.0:

| Page | Before | After | Notes |
|---|---|---|---|
| Single video | 93 | **100** | the file was downloaded 3× → now once |
| YouTube | 71 | **99** | LCP 11.4 s → 2.2 s |
| Vimeo | 95 | **100** | |
| Five videos on one page | 87 | **100** | 17.8 MB → 0.5 MB on load |
| Playlist (YouTube first) | 67 | **98** | LCP 10.6 s → 2.3 s |
| Shortcode | 88 | **100** | |
| Audio | 99 | **100** | ~15× fewer layouts while playing |

Layout shift (CLS) is **0** on every page type. How it works:

| Technique | Where |
|---|---|
| Server-rendered placeholder with reserved space (aspect ratio, width, radius, alignment) | `inc/functions.php` → `h5vp_player_placeholder()`, `h5vp_reserved_space()` |
| YouTube / Vimeo click-to-load: thumbnail first, full player on play (thumbnail cached in a transient, `preconnect` hint) | `src/blocks/view.tsx`, `h5vp_embed_thumbnail()` |
| Self-hosted players mount ~300 px before they scroll into view | `src/utils/lazyMount.ts` |
| `<video>` keeps its sources (no source swap), `preload` applied after Plyr wraps it | `src/public/MyPlayer.ts` |
| Scripts load with `defer`; no jQuery / wp-util on the front end; hls.js loaded on demand | `blocks.php` |
| Playlist durations probed after page load, one at a time, visible items only | `src/blocks/Components/Common/playlist/useVideoDuration.ts` |

**iPhone / iPad:** YouTube refuses to start from script and Vimeo starts muted when the player is created after the tap, so on iOS both load as they near the screen and the visitor's tap reaches a ready player (see `letIosTapReachYouTube()` in `MyPlayer.ts`).

**Caching plugins:** tested with WP Super Cache, Autoptimize and WP Rocket-style "Delay JavaScript execution". Pages cached before an update keep working: markup without a placeholder mounts the player straight away.

---

## 🧩 Embedding

### Gutenberg blocks

| Block | Name |
|---|---|
| HTML5 Video Player (source picker) | `html5-player/parent` |
| Video | `html5-player/video` |
| YouTube | `html5-player/youtube` |
| Vimeo | `html5-player/vimeo` |
| Video Playlist | `html5-player/playlist` |
| Audio Player | `html5-player/audio` |

### Shortcodes

A player created under **HTML5 Video Player** in the admin menu:

```
[html5_video id="123"]
```

A quick player from a URL:

```
[video_player file="https://example.com/video.mp4"]
```

| Attribute | Values |
|---|---|
| `file` / `src` / `mp4` | video URL (full URL) |
| `controls` | `play-large, restart, rewind, play, fast-forward, progress, current-time, mute, volume, captions, settings, pip, airplay, download, fullscreen` |
| `autoplay`, `muted`, `playsinline`, `reset_on_end` | `true` / `false` |
| `preload` | `auto` / `metadata` / `none` |
| `width` | e.g. `500px` or `80%` |
| `align` | `left` / `center` / `right` |
| `caption`, `caption_label` | `.vtt` URL, e.g. `English/en` |

### Elementor

The **HTML5 Video Player** widget (`H5VPPlayer`) renders the same video block, so it gets the same placeholder, lazy loading and alignment.

### Theme templates

```php
<?php echo do_shortcode( '[html5_video id="123"]' ); ?>
```

---

## 🛠 Technical Stack

- **Blocks & admin UI:** [React](https://react.dev/) (WordPress-bundled) with TypeScript
- **Player engine:** [Plyr](https://plyr.io/) 3.8.4, wrapped by `MyPlayer` (`src/public/MyPlayer.ts`)
- **Streaming:** [hls.js](https://github.com/video-dev/hls.js) 1.7.0, loaded only when an HLS source plays
- **Build:** `@wordpress/scripts` (webpack), SCSS
- **Settings & metaboxes:** Codestar Framework (`inc/Field/`)
- **Backend:** PHP 7.4+, WordPress blocks with `render.php`
- **Licensing & analytics:** bPlugins SDK (based on Freemius) via `api.bplugins.com`
- **Tests:** Playwright end-to-end tests and performance scripts (`scripts/perf/`)

---

## 📚 Third-Party Libraries

- **[Plyr](https://github.com/sampotts/plyr)** (MIT) — media player (`public/js/plyr-v3.8.4.polyfilled.js`)
- **[hls.js](https://github.com/video-dev/hls.js)** (Apache-2.0) — HLS playback (`public/js/hls.min.js`)
- **[React](https://react.dev/)** (MIT) — provided by WordPress core
- **[Immer](https://immerjs.github.io/immer/)** (MIT) — immutable option building
- **Codestar Framework** (GPL) — admin settings and metaboxes
- **Freemius SDK (bPlugins edition)** — licensing and usage tracking

---

## 💻 Developer Guide

### Directory structure

```
html5-video-player.php   Plugin bootstrap: header, constants (H5VP_VER), SDK init
blocks.php               Block registration, script/style registration (defer, content-hash versions)
elementor-widget.php     Elementor widget registration
includes.php             Loads the PHP includes
inc/                     PHP: Base, Database, Elementor, Field (Codestar), Helper, Model, PostType, Services, functions.php
src/                     Sources (TypeScript/React/SCSS)
  blocks/                Blocks: video, parent, youtube, vimeo, playlist, audio (block.json, Edit, render.php, view.tsx)
  public/                MyPlayer.ts (Plyr wrapper), reservedSpace.ts
  hooks/ utils/          Shared hooks and helpers (lazyMount.ts, isIOS.ts, ...)
  dashboard/             bPlugins admin dashboard (utils/data.js holds the dashboard changelog)
public/                  Front-end static files: Plyr, hls.js, CSS, media/blank.mp4
build/                   Compiled assets — generated, do not edit
scripts/perf/            Performance and functional test scripts
languages/               Translations
admin/, tinymce/         Admin assets, classic editor button
```

### Setup

1. Clone the repository into `wp-content/plugins/`.
2. Clone **[bpl-tools](https://github.com/bPlugins/bpl-tools)** and **wp-utils** into the same `plugins/` folder — the sources import shared components from both (`../bpl-tools`, `../wp-utils`).
3. Install dependencies:
   ```bash
   npm install
   ```

### Scripts

| Command | What it does |
|---|---|
| `npm start` | Watch mode (development build — don't measure performance on it) |
| `npm run build` | Production build + translations + `zip/html5-video-player.zip` |
| `npm run lint` | ESLint on `src` |
| `npm run format` | Format with `wp-scripts format` |
| `npm run i18n` | Generate `.pot`, `.json` and `.mo` files |
| `npm test` | Playwright end-to-end tests (`test:ui`, `test:headed` variants) |
| `npm run perf` | Lighthouse-style page audit: requests, JS, media, CLS, third-party hosts |
| `npm run perf:slow` | Same audit on throttled network and CPU |
| `npm run perf:test` | Functional checks: captions, lazy mount, keyboard, playlist, old cached markup, audio |

> The perf scripts use the installed Google Chrome through `playwright-core` and expect the `perf-*` test pages on the local site.

### Data flow

1. **Editor:** the block saves its attributes in the post content (`<!-- wp:html5-player/video {...} /-->`).
2. **Server:** `render.php` filters the attributes (`h5vp_block_attributes`), prints a placeholder with reserved space, and puts the player settings in `data-attributes`.
3. **Browser:** `view.tsx` mounts the React player as the block nears the viewport — or on click for YouTube/Vimeo — and `MyPlayer` creates the Plyr instance.
4. **Classic players and shortcodes** are converted to the same block (`inc/Helper/Block.php`), so every embed path shares one renderer.

### Hooks

| Hook | Type | Purpose |
|---|---|---|
| `h5vp_block_attributes` | filter | Video block attributes before rendering |
| `h5vp_playlist_block_attributes` | filter | Playlist block attributes before rendering |
| `h5vp_audio_block_attributes` | filter | Audio block attributes before rendering |
| `h5vp_fs_loaded` | action | Fires after the licensing SDK has loaded |

### Release checklist

1. Bump the version in `html5-video-player.php` (plugin header **and** `H5VP_VER`), `readme.txt` (`Stable tag`), `package.json` and `package-lock.json`.
2. Add the changelog to `readme.txt` and to `src/dashboard/utils/data.js`.
3. `npm run build`, then check the zip in `zip/`.
4. Run `npm run perf:test` against a production build.

---

## 🔗 Useful Links

- [Plugin page & live demo](https://bplugins.com/products/html5-video-player/)
- [Documentation](https://bplugins.com/docs/html5-video-player/)
- [WordPress.org](https://wordpress.org/plugins/html5-video-player/) · [Support forum](https://wordpress.org/support/plugin/html5-video-player/)
- [Upgrade to Pro](https://bplugins.com/products/html5-video-player/pricing/)
- Security issues: [Patchstack VDP](https://patchstack.com/database/vdp/9e5fb205-6f66-453b-bdaa-c7c587b83810)

---
*Developed by [bPlugins](https://bplugins.com)*
