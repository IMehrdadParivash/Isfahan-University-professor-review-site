<?php
declare(strict_types=1);
require_once __DIR__ . '/app/bootstrap.php';
header('Cache-Control: no-cache, must-revalidate');
readfile(__DIR__ . '/index.html');
