<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/bootstrap.php';
$pdo = Database::connection();
$expired = $pdo->prepare('DELETE FROM rate_limits WHERE expires_at < ?');
$expired->execute([gmdate('Y-m-d H:i:s')]);
$forget = $pdo->prepare('UPDATE reviews SET technical_hash = NULL WHERE technical_hash IS NOT NULL AND created_at < ?');
$forget->execute([gmdate('Y-m-d H:i:s', time() - 90 * 86400)]);
fwrite(STDOUT, "Expired rate-limit rows removed: {$expired->rowCount()}\nTechnical review hashes forgotten: {$forget->rowCount()}\n");
