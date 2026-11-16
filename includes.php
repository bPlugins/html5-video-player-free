<?php
if (!defined('ABSPATH'))
    exit;
if (!class_exists('CSF') && file_exists(dirname(__FILE__) . "/vendor/codestar-framework/codestar-framework.php")) {
    require_once dirname(__FILE__) . "/vendor/codestar-framework/codestar-framework.php";
}

$h5vp_include_files = array(
    __DIR__ . "/blocks.php",
    __DIR__ . "/elementor-widget.php",
    __DIR__ . "/inc/functions.php",
    __DIR__ . "/inc/class-h5vp-promo-banner.php",
);

foreach ($h5vp_include_files as $h5vp_file) {
    if (file_exists($h5vp_file)) {
        require_once $h5vp_file;
    }
}
