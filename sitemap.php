<?php
declare(strict_types=1);
require_once __DIR__ . '/app/bootstrap.php';
header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');
$base = rtrim((string) Config::get('base_url', ''), '/');
if ($base === '') { http_response_code(503); exit; }
$rows = Database::connection()->query('SELECT id, updated_at FROM professors WHERE is_active = 1 ORDER BY id')->fetchAll();
echo '<?xml version="1.0" encoding="UTF-8"?>', "\n";
?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc><?=htmlspecialchars($base . '/', ENT_XML1)?></loc><changefreq>daily</changefreq><priority>1.0</priority></url><?php foreach ($rows as $row): ?><url><loc><?=htmlspecialchars($base . '/professor.php?id=' . (int)$row['id'], ENT_XML1)?></loc><lastmod><?=htmlspecialchars(substr((string)$row['updated_at'], 0, 10), ENT_XML1)?></lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url><?php endforeach; ?></urlset>
