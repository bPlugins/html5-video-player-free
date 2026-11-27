<?php

namespace H5VP;

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

class Init
{

    public static function get_services()
    {
        return [
            Base\GlobalChanges::class,
            Base\AdminNotice::class,
            Base\OnboardingNotice::class,
            Services\EnqueueAssets::class,
            Services\Shortcodes::class,
            Services\ConvertEmbeds::class,
            Services\VideoLibrary::class,
            Services\FieldHelp::class,
            Field\VideoPlayer::class,
            Field\QuickPlayer::class,
            Field\Settings::class,
            Model\Ajax::class,
            Model\Onboarding::class,
        ];
    }

    public static function register_services()
    {
        foreach (self::get_services() as $class) {
            $service = self::instantiate($class);
            if ($service && method_exists($service, 'register')) {
                $service->register();
            }
        }
    }

    public static function register_post_type()
    {
        $postType = self::instantiate(PostType\VideoPlayer::class);
        if ($postType && method_exists($postType, 'register')) {
            $postType->register();
        }
    }

    private static function instantiate($class)
    {
        if (!class_exists($class)) {
            // wp_trigger_error() only emits when WP_DEBUG is on and sanitizes
            // the message itself, so this stays silent on production sites.
            wp_trigger_error(__METHOD__, "service class {$class} is missing", E_USER_WARNING);
            return null;
        }
        return new $class();
    }
}
