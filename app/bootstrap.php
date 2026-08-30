<?php
declare(strict_types=1);

define('APP_ROOT', dirname(__DIR__));
require_once APP_ROOT . '/app/Config.php';
require_once APP_ROOT . '/app/Database.php';
require_once APP_ROOT . '/app/Http.php';
require_once APP_ROOT . '/app/Security.php';
require_once APP_ROOT . '/app/ReviewService.php';

Config::load(APP_ROOT);
Http::securityHeaders();
date_default_timezone_set('UTC');
