// import { gridIcon, masonryIcon, sliderIcon, tickerIcon } from '../../utils/icons';

import { slug, gutenbergTabIcon, shortcodeTabIcon, elementorTabIcon } from './shared'


export const dashboardInfo = (info) => {
    const { version, adminUrl = '', setupUrl = '', editor = '' } = info;

    return {
        name: `HTML5 Video Player`,
        adminUrl,
        setupUrl,
        editor,
        displayName: `HTML5 Video Player - Embed and Play Videos in Custom Player`,
        description:
            "HTML5 Video Player Plugin lets you embed responsive videos in WordPress. It’s easy to use, fast, and supports MP4, WebM, OGG, Youtube and Vimeo.",
        slug,
        version,
        displayOurPlugins: true,
        media: {
            logo: `https://ps.w.org/${slug}/assets/icon-128x128.png`,
            banner: `https://ps.w.org/${slug}/assets/banner-772x250.png`,
            thumbnail: window.h5vpDashboard?.dir + `admin/img/${slug}.png`,
            video: 'https://youtu.be/rOVr8TX5C70',
            isYoutube: true
        },
        pages: {
            org: `https://wordpress.org/plugins/${slug}/`,
            docs: `https://bplugins.com/docs/${slug}/`,
            pricing: `https://bplugins.com/products/${slug}/pricing`,
        },
        freemius: {
            product_id: 14259,
            plan_id: 23848,
            public_key: 'pk_42a72d9cdea87e78854f59cdc1293'
        },
        startButton: {
            label: 'Start Now',
            url: `${adminUrl}post-new.php?post_type=videoplayer`
        }
    }
}





export const welcomeInfo = (adminUrl, editor = '') => ({
    keywords: ['MP4', 'YouTube', 'Vimeo', 'HLS', 'VAST Ads', 'Chapters'],
    keywordsLabel: 'Formats & Features',
    gettingStarted: {
        // Opens on the workflow chosen during guided setup; falls back to the
        // first tab when nothing was picked.
        defaultTab: editor,
        tabs: [
            {
                key: 'shortcode',
                label: 'Shortcode',
                icon: shortcodeTabIcon,
                video: 'https://youtube.com/watch?v=M0TCSXgK-RU',
                steps: [
                    {
                        num: 1,
                        title: 'Create Player CPT',
                        body: 'Go to <strong>Video Player &rsaquo; Add New Player</strong> from the WordPress admin menu.',
                        link: { url: `${adminUrl}post-new.php?post_type=videoplayer`, label: 'Add Player' }
                    },
                    {
                        num: 2,
                        title: 'Upload & Configure',
                        body: 'Add video sources, adjust dimensions, player theme colors, and setup features.'
                    },
                    {
                        num: 3,
                        title: 'Copy Shortcode',
                        body: 'Publish the player post and copy the generated shortcode (e.g., <code>[html5_video id="..."]</code>).'
                    },
                    {
                        num: 4,
                        title: 'Embed Anywhere',
                        body: 'Paste the copied shortcode into any post, page, widget area, or theme template file.'
                    }
                ]
            },
            {
                key: 'gutenberg',
                label: 'Gutenberg',
                icon: gutenbergTabIcon,
                video: 'https://youtube.com/watch?v=FkS3J1Eu51M',
                steps: [
                    {
                        num: 1,
                        title: 'Add the Block',
                        body: 'Open the Gutenberg editor, click <strong>+</strong> or type <strong>/Video Player</strong> to insert the HTML5 Video Player parent block.',
                        link: { url: `${adminUrl}post-new.php`, label: 'Open Editor' }
                    },
                    {
                        num: 2,
                        title: 'Insert Source Block',
                        body: 'Add a child block like <strong>Video File</strong>, <strong>YouTube</strong>, or <strong>Vimeo</strong> depending on your video format.'
                    },
                    {
                        num: 3,
                        title: 'Configure Settings',
                        body: 'Select the block and adjust settings like Autoplay, Mute, Loop, Watermark, and Subtitles in the inspector sidebar.'
                    },
                    {
                        num: 4,
                        title: 'Publish & Preview',
                        body: 'Publish or preview your page to see the video player rendered live.'
                    }
                ]
            },
            {
                key: 'elementor',
                label: 'Elementor',
                icon: elementorTabIcon,
                video: 'https://youtube.com/watch?v=FeagU3HH1FM',
                steps: [
                    {
                        num: 1,
                        title: 'Edit with Elementor',
                        body: 'Open your page in the Elementor editor and search for <strong>HTML5 Video Player</strong> in the widget list.'
                    },
                    {
                        num: 2,
                        title: 'Drag & Drop Widget',
                        body: 'Drag the widget to the desired section or column in your layout.'
                    },
                    {
                        num: 3,
                        title: 'Select Video/Player',
                        body: 'Input your video URL, or select a pre-configured video player ID from the dropdown list.'
                    },
                    {
                        num: 4,
                        title: 'Style & Save',
                        body: 'Use the Style tab to adjust margins, background color, responsive visibility, and save your changes.'
                    }
                ]
            }
        ]
    },
    changelogs: [
        {
            version: '2.14.0 - 7 Oct, 2026',
            type: 'update',
            list: [
                '<strong>Improvement:</strong> Much faster pages: YouTube/Vimeo load only on play, players below the fold load on scroll, no layout shift',
                '<strong>Improvement:</strong> Each video downloads once, scripts no longer block rendering, jQuery is no longer loaded on the front end',
                '<strong>Improvement:</strong> Works with WP Rocket, Autoptimize and WP Super Cache',
                '<strong>Improvement:</strong> Redesigned playback speed menu, "Copied!" feedback for shortcodes, settings remember the open tab',
                '<strong>Fixed:</strong> YouTube on iPhone/iPad, captions staying on after CC off, YouTube live/ links, Vimeo and video ID input',
                '<strong>Fixed:</strong> Single player playback, a PHP warning, playlist scrollbar and download button color'
            ]
        },
        {
            version: '2.13.1 - 16 Sep, 2026',
            type: 'fix',
            list: [
                '<strong>Fixed:</strong> The Elementor widget did not appear in the Elementor editor.'
            ]
        },
        {
            version: '2.13.0 - 22 August, 2026',
            type: 'new',
            list: [
                '<strong>Added:</strong> Video Playlist block and Audio Player block with four skins',
                '<strong>Added:</strong> HLS (.m3u8) streaming and subtitle/caption (.vtt) support',
                '<strong>Added:</strong> Player alignment, Preload option and inline playback on iOS',
                '<strong>Fixed:</strong> The Elementor widget did not render a player in the editor preview'
            ]
        },
        {
            version: '2.12.0 - 3 August, 2026',
            type: 'new',
            list: [
                '<strong>Added:</strong> Guided setup wizard shown after activation',
                '<strong>Added:</strong> "Guided Setup" link in the dashboard to re-run it any time',
                '<strong>Improvement:</strong> Site-wide settings changes now require the manage_options capability'
            ]
        }
    ],
    changelogsLimit: 6,
    changelogsReadMoreLabel: 'View More Changelogs',
    proFeatures: [
        '6 Premium Player Skins (Modern, Floating Pill, Stacked & more).',
        'Email Capture to grow your list (Mailchimp, MailerLite, ActiveCampaign, FluentCRM).',
        'Video Analytics and Google Analytics (GA4) tracking.',
        'Monetize your videos with Google VAST Ads.',
        'Password Protection and User-Role Restrictions.',
        'Dynamic Watermark to stop video piracy.',
        'Popup Player, Sticky Player and Custom End Screen.',
        'Chapters, Quality Switcher, DASH Streaming and Multiple Subtitles.',
        'Advanced Playlists with 3 extra layouts and live search.'
    ]
});

export const demoInfo = {
    // allInOneLabel: 'See All Demos',
    // allInOneLink: 'https://apb.bplugins.com/all-demos-in-one-place/',
    demos: [
        {
            title: "Player with All Controls",
            url: "https://wpvideoplayer.com/demo/demo-1-player-with-all-controls/",
            icon: <svg width="20" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path d='M0 416c0 17.7 14.3 32 32 32l54.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 448c17.7 0 32-14.3 32-32s-14.3-32-32-32l-246.7 0c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48L32 384c-17.7 0-32 14.3-32 32zm128 0a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zM320 256a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm32-80c-32.8 0-61 19.7-73.3 48L32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l246.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48l54.7 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-54.7 0c-12.3-28.3-40.5-48-73.3-48zM192 128a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm73.3-64C253 35.7 224.8 16 192 16s-61 19.7-73.3 48L32 64C14.3 64 0 78.3 0 96s14.3 32 32 32l86.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 128c17.7 0 32-14.3 32-32s-14.3-32-32-32L265.3 64z' /></svg>,
            type: "iframe"
        },
        {
            title: "Central Play Button Only",
            url: "https://wpvideoplayer.com/demo/demo-4-video-player-with-only-central-play-button-only/",
            icon: <svg width="20" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path d='M0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM188.3 147.1c-7.6 4.2-12.3 12.3-12.3 20.9V344c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88c-7.4-4.5-16.7-4.7-24.3-.5z' /></svg>,
            type: "iframe"
        },
        {
            title: "Password Protected Video",
            url: "https://wpvideoplayer.com/demo/demo-5-password-protected-video-password-demo/",
            icon: <svg width="20" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path d='M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0z' /></svg>,
            type: "iframe"
        },
        {
            title: "Google Ads Support (VAST)",
            url: "https://wpvideoplayer.com/demo/demo-6-google-ads-support-vast-support/",
            icon: <svg width="20" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 512'><path d='M392.8 1.2c-17-4.9-34.7 5-39.6 22l-128 448c-4.9 17 5 34.7 22 39.6s34.7-5 39.6-22l128-448c4.9-17-5-34.7-22-39.6zm80.6 120.1c-12.5 12.5-12.5 32.8 0 45.3L562.7 256l-89.4 89.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l112-112c12.5-12.5 12.5-32.8 0-45.3l-112-112c-12.5-12.5-32.8-12.5-45.3 0zm-306.7 0c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3l112 112c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256l89.4-89.4c12.5-12.5 12.5-32.8 0-45.3z' /></svg>,
            type: "iframe"
        },
        {
            title: "YouTube Video",
            url: "https://wpvideoplayer.com/demo/demo-7-a-video-from-youtube/",
            icon: <svg width="20" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512'><path d='M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z' /></svg>,
            type: "iframe"
        },
        {
            title: "Vimeo Video",
            url: "https://wpvideoplayer.com/demo/demo-8-a-video-from-vimeo/",
            icon: <svg width="20" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 448 512'><path d='M447.8 153.6c-2 43.6-32.4 103.3-91.4 179.1-60.9 79.2-112.4 118.8-154.6 118.8-26.1 0-48.2-24.1-66.3-72.3C100.3 250 85.3 174.3 56.2 174.3c-3.4 0-15.1 7.1-35.2 21.1L0 168.2c51.6-45.3 100.9-95.7 131.8-98.5 34.9-3.4 56.3 20.5 64.4 71.5 28.7 181.5 41.4 208.9 93.6 126.7 18.7-29.6 28.8-52.1 30.2-67.6 4.8-45.9-35.8-42.8-63.3-31 22-72.1 64.1-107.1 126.2-105.1 45.8 1.2 67.5 31.1 64.9 89.4z' /></svg>,
            type: "iframe"
        },
        {
            title: "Sticky Video Player",
            url: "https://wpvideoplayer.com/demo/demo-9-sticky-video-player-scroll-to-see/",
            icon: <svg width="20" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' id='pip'><path d='M0 3.5A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5zM1.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5z' /><path d='M8 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5z' /></svg>,
            type: "iframe"
        },
        {
            title: "Streaming DASH.js",
            url: "https://wpvideoplayer.com/demo/demo-10-streaming-dash-js/",
            icon: <svg width="20" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path d='M192 32c0-17.7 14.3-32 32-32C383.1 0 512 128.9 512 288c0 17.7-14.3 32-32 32s-32-14.3-32-32C448 164.3 347.7 64 224 64c-17.7 0-32-14.3-32-32zM60.6 220.6L164.7 324.7l28.4-28.4c-.7-2.6-1.1-5.4-1.1-8.3c0-17.7 14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32c-2.9 0-5.6-.4-8.3-1.1l-28.4 28.4L291.4 451.4c14.5 14.5 11.8 38.8-7.3 46.3C260.5 506.9 234.9 512 208 512C93.1 512 0 418.9 0 304c0-26.9 5.1-52.5 14.4-76.1c7.5-19 31.8-21.8 46.3-7.3zM224 96c106 0 192 86 192 192c0 17.7-14.3 32-32 32s-32-14.3-32-32c0-70.7-57.3-128-128-128c-17.7 0-32-14.3-32-32s14.3-32 32-32z' /></svg>,
            type: "iframe"
        },
        {
            title: "Streaming HLS.js",
            url: "https://wpvideoplayer.com/demo/demo-11-streaming-hls-js/",
            icon: <svg width="20" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path d='M233 7c-9.4-9.4-24.6-9.4-33.9 0l-96 96c-9.4 9.4-9.4 24.6 0 33.9l89.4 89.4-15.5 15.5C152.3 230.4 124.9 224 96 224c-31.7 0-61.5 7.7-87.8 21.2c-9 4.7-10.3 16.7-3.1 23.8L112.7 376.7 96.3 393.1c-2.6-.7-5.4-1.1-8.3-1.1c-17.7 0-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32c0-2.9-.4-5.6-1.1-8.3l16.4-16.4L242.9 506.9c7.2 7.2 19.2 5.9 23.8-3.1C280.3 477.5 288 447.7 288 416c0-28.9-6.4-56.3-17.8-80.9l15.5-15.5L375 409c9.4 9.4 24.6 9.4 33.9 0l96-96c9.4-9.4 9.4-24.6 0-33.9l-89.4-89.4 55-55c12.5-12.5 12.5-32.8 0-45.3l-48-48c-12.5-12.5-32.8-12.5-45.3 0l-55 55L233 7zm159 351l-72.4-72.4 62.1-62.1L454.1 296 392 358.1zM226.3 192.4L153.9 120 216 57.9l72.4 72.4-62.1 62.1z' /></svg>,
            type: "iframe"
        },
        {
            title: "Mobile Optimized",
            url: "https://wpvideoplayer.com/demo/demo-12-less-controls-button-in-mobile-device/",
            icon: <svg width="20" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 384 512'><path d='M16 64C16 28.7 44.7 0 80 0H304c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H80c-35.3 0-64-28.7-64-64V64zM144 448c0 8.8 7.2 16 16 16h64c8.8 0 16-7.2 16-16s-7.2-16-16-16H160c-8.8 0-16 7.2-16 16zM304 64H80V384H304V64z' /></svg>,
            type: "iframe"
        },
        {
            title: "Video with Subtitle",
            url: "https://wpvideoplayer.com/demo/demo-13-video-with-subtitle/",
            icon: <svg width="20" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512'><path d='M512 80c8.8 0 16 7.2 16 16V416c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16H512zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zM200 208c14.2 0 27 6.1 35.8 16c8.8 9.9 24 10.7 33.9 1.9s10.7-24 1.9-33.9c-17.5-19.6-43.1-32-71.5-32c-53 0-96 43-96 96s43 96 96 96c28.4 0 54-12.4 71.5-32c8.8-9.9 8-25-1.9-33.9s-25-8-33.9 1.9c-8.8 9.9-21.6 16-35.8 16c-26.5 0-48-21.5-48-48s21.5-48 48-48zm144 48c0-26.5 21.5-48 48-48c14.2 0 27 6.1 35.8 16c8.8 9.9 24 10.7 33.9 1.9s10.7-24 1.9-33.9c-17.5-19.6-43.1-32-71.5-32c-53 0-96 43-96 96s43 96 96 96c28.4 0 54-12.4 71.5-32c8.8-9.9 8-25-1.9-33.9s-25-8-33.9 1.9c-8.8 9.9-21.6 16-35.8 16c-26.5 0-48-21.5-48-48z' /></svg>,
            type: "iframe"
        },
        {
            title: "Multiple Chapter",
            url: "https://wpvideoplayer.com/demo/demo-15-chapter/",
            icon: <svg width="20" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path d='M464 256A208 208 0 1 1 48 256a208 208 0 1 1 416 0zM0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z' /></svg>,
            type: "iframe"
        },
        {
            title: "Autoplay \u0026 Text Watermark",
            url: "https://wpvideoplayer.com/demo/demo-16-autoplay-and-overlay-text/",
            icon: <svg width="20" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' id='window-desktop'><path d='M3.5 11a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z' /><path d='M2.375 1A2.366 2.366 0 0 0 0 3.357v9.286A2.366 2.366 0 0 0 2.375 15h11.25A2.366 2.366 0 0 0 16 12.643V3.357A2.366 2.366 0 0 0 13.625 1zM1 3.357C1 2.612 1.611 2 2.375 2h11.25C14.389 2 15 2.612 15 3.357V4H1zM1 5h14v7.643c0 .745-.611 1.357-1.375 1.357H2.375A1.366 1.366 0 0 1 1 12.643z' /></svg>,
            type: "iframe"
        }
    ],
}

export const pricingInfo = {
    logo: `https://ps.w.org/${slug}/assets/icon-128x128.png`, // Optional
    pluginId: 14259,
    planId: 23848,
    licenses: [
        1,
        3,
        null
    ],
    button: {
        label: 'Buy Now ➜'
    },
    featured: {
        selected: 3, // choose from licenses item
    }
}