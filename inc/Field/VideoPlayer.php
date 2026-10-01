<?php

namespace H5VP\Field;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

class VideoPlayer
{
    public $prefix = '_h5vp_';

    public function register()
    {
        add_action('init', [$this, 'register_fields'], 0);
    }
    public function register_fields()
    {
        if (class_exists('\CSF')) {
            $prefix = '_h5vp_';
            \CSF::createMetabox($prefix, array(
                'title' => 'Configure Your Video Player',
                'post_type' => 'videoplayer',
                'data_type' => 'unserialize',
                'theme' => 'light'
            ));

            $this->media();
            $this->controls($prefix);
            $this->style();
        }
    }

    public function media()
    {

        \CSF::createSection($this->prefix, array(
            'title' => __('Media', 'html5-video-player'),
            'id' => 'h5vp_media',
            'fields' => [
                array(
                    'id' => 'h5vp_video_source',
                    'title' => 'Video Source',
                    'type' => 'button_set',
                    'options' => array(
                        'library' => 'Library or CDN source',
                        'youtube' => 'Youtube',
                        'vimeo' => 'Vimeo'
                    ),
                    'default' => 'library',
                ),
                array(
                    'id' => 'h5vp_video_link_youtube_vimeo',
                    'type' => 'text',
                    'title' => 'Source URL',
                    'placeholder' => 'https://',
                    'library' => 'video',
                    'button_title' => 'Add Video',
                    'desc' => 'Youtube video url or ID',
                    'dependency' => array(array('h5vp_video_source', 'not-any', 'library', 'all')),
                    'attributes' => array('style' => 'width: 100%;')
                ),
                array(
                    'id' => 'h5vp_video_link',
                    'type' => 'upload',
                    'title' => 'Source URL',
                    'placeholder' => 'https://',
                    'library' => 'video',
                    'button_title' => 'Add Video',
                    'attributes' => array('class' => 'h5vp_video_link', 'id' => 'h5vp_google_document_url'),
                    'desc' => __('Select an MP4, WebM, MOV, OGG video file, or paste an external video or HLS (.m3u8) stream URL.', 'html5-video-player'),
                    'dependency' => array('h5vp_video_source', 'any', 'library', 'all'),
                ),
                array(
                    'id' => 'h5vp_video_thumbnails',
                    'type' => 'upload',
                    'title' => 'Video Thumbnail',
                    'subtitle' => 'for youtube and vimeo, the thumbnail only a backup. if failed to fetch the default thumbnail, this will show',
                    'library' => 'image',
                    'button_title' => 'Add Image',
                    'placeholder' => 'https://',
                    'attributes' => array('class' => 'h5vp_video_thumbnails'),
                    'desc' => 'specifies an image to be shown while the video is downloading or until the user hits the play button',
                ),
                array(
                    'id' => 'h5vp_caption_label',
                    'type' => 'text',
                    'title' => __('Subtitle Label', 'html5-video-player'),
                    'placeholder' => 'English/en',
                    'default' => 'English/en',
                    'desc' => __('Enter label and language code (e.g. English/en).', 'html5-video-player'),
                    'dependency' => array('h5vp_video_source', 'any', 'library', 'all'),
                ),
                array(
                    'id' => 'h5vp_caption_file',
                    'type' => 'upload',
                    'title' => __('Subtitle File (.vtt)', 'html5-video-player'),
                    'settings' => array(
                        'upload_type' => 'text/vtt',
                        'button_title' => __('Upload .vtt File', 'html5-video-player'),
                        'frame_title' => __('Select .vtt Caption File', 'html5-video-player'),
                    ),
                    'desc' => __('Upload a .vtt caption file or paste an external .vtt URL.', 'html5-video-player'),
                    'dependency' => array('h5vp_video_source', 'any', 'library', 'all'),
                ),
            ]
        ));
    }

    public function controls($prefix)
    {
        // Global player defaults, so a value set on the Settings screen (and any
        // value carried over from the premium version) is used as the default.
        $preset = h5vp_get_option('h5vp_option');

        // Create a section
        \CSF::createSection($prefix, array(
            'title' => 'General',
            'id' => 'noting-to-hide',
            'fields' => array(
                array(
                    'id' => 'h5vp_controls',
                    'type' => 'button_set',
                    'title' => __('Controls', 'html5-video-player'),
                    'multiple' => true,
                    'options' => array(
                        'play-large' => __('Play Large', 'html5-video-player'),
                        'restart' => __('Restart', 'html5-video-player'),
                        'rewind' => __('Rewind', 'html5-video-player'),
                        'play' => __('Play', 'html5-video-player'),
                        'fast-forward' => __('Fast Forwards', 'html5-video-player'),
                        'progress' => __('Progressbar', 'html5-video-player'),
                        'duration' => __('Duration', 'html5-video-player'),
                        'current-time' => __('Current Time', 'html5-video-player'),
                        'mute' => __('Mute Button', 'html5-video-player'),
                        'volume' => __('Volume Control', 'html5-video-player'),
                        'captions' => __('Captions', 'html5-video-player'),
                        'settings' => __('Setting Button', 'html5-video-player'),
                        'pip' => __('PIP', 'html5-video-player'),
                        'airplay' => __('Airplay', 'html5-video-player'),
                        'download' => __('Download Button', 'html5-video-player'),
                        'fullscreen' => __('Fullscreen', 'html5-video-player')
                    ),
                    'default' => array('play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'download', 'fullscreen'),
                    'desc' => __('download & pip controls will not work for youtube and vimeo', 'html5-video-player')
                ),
                array(
                    'id' => 'h5vp_repeat_playerio',
                    'type' => 'button_set',
                    'title' => 'Repeat',
                    'desc' => __("Automatically replay the video from the beginning after it ends.", "html5-video-player"),
                    'options' => array(
                        'once' => 'Once',
                        'loop' => 'Loop',
                    ),
                    'default' => 'once',
                ),
                array(
                    'id' => 'h5vp_muted_playerio',
                    'type' => 'switcher',
                    'title' => 'Muted',
                    'desc' => __("Start the video with sound turned off by default.", "html5-video-player"),
                    'default' => '0',
                ),
                array(
                    'id' => 'h5vp_auto_play_playerio',
                    'type' => 'switcher',
                    'title' => 'Auto Play',
                    'subtitle' => __('Video should be muted or have user interaction if you want to play in autoplay', 'html5-video-player'),
                    'desc' => 'Turn On if you  want video will start playing as soon as it is ready. <a href="https://developers.google.com/web/updates/2017/09/autoplay-policy-changes">autoplay policy</a>',
                    'default' => '0',
                ),

                array(
                    'id' => 'h5vp_auto_hide_control_playerio',
                    'type' => 'switcher',
                    'title' => 'Auto Hide Control',
                    'desc' => __("Hide video controls automatically after 2s of no mouse or focus movement", "html5-video-player"),
                    'default' => '1',
                ),
                array(
                    'id' => 'h5vp_playsinline_playerio',
                    'type' => 'switcher',
                    'title' => 'Allow Inline Playback on iOS',
                    'desc' => __("Allow inline playback on iOS. Note this has no effect on iPadOS.", "html5-video-player"),
                    'default' => $preset('h5vp_op_playsinline_playerio', '1'),
                ),
                array(
                    'id' => 'h5vp_preload_playerio',
                    'type' => 'radio',
                    'title' => 'Preload',
                    'options' => array(
                        'auto' => 'Auto - Browser should load the entire file when the page loads.',
                        'metadata' => 'Metadata - Browser should load only meatadata when the page loads.',
                        'none' => 'None - Browser should NOT load the file when the page loads.',
                    ),
                    'desc' => __("Control how much of the video is loaded before playback. Options affect loading speed and bandwidth usage.", "html5-video-player"),
                    'default' => $preset('h5vp_op_preload_playerio', 'metadata'),
                    // preload is a <video> attribute, so it has no effect on the
                    // YouTube/Vimeo iframe embeds.
                    'dependency' => array('h5vp_video_source', 'any', 'library', 'all'),
                ),
                array(
                    'id' => 'h5vp_ratio',
                    'type' => 'text',
                    'title' => 'Ratio',
                    'desc' => __("Select the width-to-height ratio used to display the video.", "html5-video-player"),
                    'placeholder' => '16:9'
                ),
                array(
                    'id' => 'h5vp_speed',
                    'type' => 'text',
                    'title' => 'Speed',
                    'desc' => __("Select the speed options.", "html5-video-player"),
                    'default' => '0.5,0.75,1,1.25,1.5,1.75,2,4'
                ),
            ),
        ));
    }

    public function style()
    {
        // Create a section for width and round corner
        \CSF::createSection($this->prefix, array(
            'title' => 'Style',
            'id' => 'h5vp_style',
            'fields' => array(
                array(
                    'id' => 'h5vp_player_width_playerio',
                    'type' => 'spinner',
                    'title' => 'Player Width',
                    'unit' => 'px',
                    'max' => '5000',
                    'min' => '200',
                    'step' => '50',
                    'desc' => 'set the player width. Height will be calculate base on the value. Left blank for Responsive player',
                    'default' => '',
                ),
                array(
                    'id' => 'h5vp_align_playerio',
                    'type' => 'button_set',
                    'title' => __('Alignment', 'html5-video-player'),
                    'options' => array(
                        '' => __('Default', 'html5-video-player'),
                        'left' => __('Left', 'html5-video-player'),
                        'center' => __('Center', 'html5-video-player'),
                        'right' => __('Right', 'html5-video-player'),
                    ),
                    'desc' => __("Position the player inside its container. Only visible once the player width is narrower than the container — a full width player has nowhere to move.", "html5-video-player"),
                    'default' => '',
                ),
                array(
                    'id' => 'h5vp_round_corner',
                    'type' => 'spinner',
                    'title' => 'Round Corner',
                    'unit' => 'px',
                    'max' => '500',
                    'min' => '0',
                    'step' => '5',
                    'desc' => 'set the player round corner. Left blank for default',
                    'default' => '',
                ),
            ),
        ));


    }



}

