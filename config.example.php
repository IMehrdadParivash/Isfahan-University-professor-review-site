<?php
declare(strict_types=1);

/* Copy to config.php and replace every CHANGE_ME value. config.php is ignored by Git. */
return [
    'environment' => 'production',
    'base_url' => 'https://CHANGE_ME.ir',
    'db_dsn' => 'mysql:host=localhost;dbname=CHANGE_ME;charset=utf8mb4',
    'db_user' => 'CHANGE_ME',
    'db_pass' => 'CHANGE_ME',
    'app_key' => 'CHANGE_ME_USE_64_RANDOM_HEX_CHARACTERS',
    'admin_password_hash' => 'CHANGE_ME_USE_PASSWORD_HASH',
    'accounts_enabled' => false,
    'review_auto_publish' => true,
    'trust_cloudflare_ip_header' => false,
    'session_name' => 'ui_reviews_session',
];
