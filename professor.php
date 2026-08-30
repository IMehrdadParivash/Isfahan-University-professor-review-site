<?php
declare(strict_types=1);
require_once __DIR__ . '/app/bootstrap.php';

function h(?string $value): string { return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

$id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if (!$id) { http_response_code(404); exit('استاد پیدا نشد.'); }
$pdo = Database::connection();
$query = $pdo->prepare('SELECT p.id, p.name_fa, p.academic_rank, p.official_profile_url, d.name AS department, f.name AS faculty FROM professors p LEFT JOIN departments d ON d.id = p.department_id LEFT JOIN faculties f ON f.id = d.faculty_id WHERE p.id = ? AND p.is_active = 1');
$query->execute([$id]);
$professor = $query->fetch();
if (!$professor) { http_response_code(404); exit('استاد پیدا نشد.'); }
$coursesQuery = $pdo->prepare('SELECT c.name FROM courses c JOIN professor_courses pc ON pc.course_id = c.id WHERE pc.professor_id = ? ORDER BY c.name LIMIT 30');
$coursesQuery->execute([$id]);
$courses = array_column($coursesQuery->fetchAll(), 'name');
$reviewsPayload = ReviewService::listForProfessor((int) $id, ['page' => 1, 'sort' => (string) ($_GET['sort'] ?? 'helpful')]);
$stats = $reviewsPayload['stats'];
$statsData = $stats ? json_decode((string) $stats['stats_json'], true) : ['criteria' => [], 'distribution' => []];
$base = rtrim((string) Config::get('base_url', ''), '/');
$canonical = $base !== '' ? $base . '/professor.php?id=' . (int) $id : '';
$description = 'نظر و تجربه دانشجویان درباره ' . $professor['name_fa'] . ' از ' . ($professor['department'] ?: 'دانشگاه اصفهان') . '؛ امتیاز تدریس، امتحان، نمره‌دهی و رفتار.';
$nonce = base64_encode(random_bytes(18));
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{$nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
$structured = [
    '@context' => 'https://schema.org', '@type' => 'Person', 'name' => $professor['name_fa'],
    'affiliation' => ['@type' => 'CollegeOrUniversity', 'name' => 'دانشگاه اصفهان'],
    'url' => $canonical ?: null,
];
if ($stats && (int) $stats['review_count'] > 0) {
    $structured['aggregateRating'] = ['@type' => 'AggregateRating', 'ratingValue' => (float) $stats['avg_overall'], 'ratingCount' => (int) $stats['review_count'], 'bestRating' => 5, 'worstRating' => 1];
}
?>
<!doctype html><html lang="fa" dir="rtl" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?=h($professor['name_fa'])?> | نظر دانشجویان</title><meta name="description" content="<?=h($description)?>"><meta property="og:type" content="profile"><meta property="og:locale" content="fa_IR"><meta property="og:title" content="<?=h($professor['name_fa'])?> | نظر دانشجویان"><meta property="og:description" content="<?=h($description)?>"><?php if ($canonical): ?><link rel="canonical" href="<?=h($canonical)?>"><meta property="og:url" content="<?=h($canonical)?>"><?php endif; ?><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/css/app.css"><link rel="stylesheet" href="assets/css/fonts.css"><script nonce="<?=h($nonce)?>" type="application/ld+json"><?=json_encode($structured, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP)?></script></head>
<body><header class="topbar"><div class="shell topbar-inner"><a class="brand" href="./"><span class="brandmark" aria-hidden="true"></span><span>امتیاز استادان<small>دانشگاه اصفهان</small></span></a><a class="ghost" href="./">جست‌وجوی استادان</a></div></header>
<main class="professor-page"><div class="shell"><nav class="breadcrumbs" aria-label="مسیر صفحه"><a href="./">استادان</a><span>‹</span><span><?=h($professor['faculty'])?></span><span>‹</span><span><?=h($professor['name_fa'])?></span></nav>
<section class="professor-hero"><div><span class="kicker">صفحهٔ مستقل استاد</span><h1><?=h($professor['name_fa'])?></h1><p><?=h(implode(' • ', array_filter([$professor['academic_rank'], $professor['faculty'], $professor['department']])))?></p><div class="badges"><?php foreach ($courses as $course): ?><span class="badge"><?=h($course)?></span><?php endforeach; ?></div></div><div class="profile-score large"><b><?=$stats ? h(number_format((float) $stats['avg_overall'], 2)) : '—'?></b><span><?=$stats ? h(number_format((int) $stats['review_count'])) . ' نظر جدید' : 'بدون نظر جدید'?></span><?php if ($stats && $stats['recommend_percent'] !== null): ?><small><?=h(number_format((float) $stats['recommend_percent'], 0))?>٪ پیشنهاد می‌کنند</small><?php endif; ?></div></section>
<?php if ($stats): ?><section class="stats-panel"><h2>خلاصهٔ آماری</h2><div class="stats-cards"><?php foreach (($statsData['criteria'] ?? []) as $criterion => $value): ?><div><span><?=h(['overall'=>'امتیاز کلی','strictness'=>'سخت‌گیری','teaching_quality'=>'کیفیت تدریس','grading_fairness'=>'عدالت نمره‌دهی','exam_difficulty'=>'سختی امتحان','behavior'=>'رفتار','attendance'=>'حضور و غیاب','workload'=>'حجم تکلیف','exam_alignment'=>'تطابق امتحان'][$criterion] ?? $criterion)?></span><b><?=h(number_format((float) $value['average'], 2))?></b><small><?=h(number_format((int) $value['count']))?> پاسخ</small></div><?php endforeach; ?></div></section><?php endif; ?>
<section class="professor-reviews"><div class="section-title"><div><h2>تجربه‌های دانشجویان</h2><small>نظرهای انتقادی فقط به‌دلیل منفی‌بودن حذف نمی‌شوند.</small></div><a class="primary-action" href="./#professor=<?=(int)$id?>">ثبت تجربه</a></div><div class="public-review-list"><?php if (!$reviewsPayload['reviews']): ?><div class="empty">هنوز نظری در سامانهٔ جدید ثبت نشده است.</div><?php endif; ?><?php foreach ($reviewsPayload['reviews'] as $review): ?><article class="public-review" id="review-<?=h((string)$review['id'])?>"><div class="public-review-head"><div class="review-author"><b><?=h($review['author_label'])?></b><span><?=h($review['display_mode'] === 'anonymous' ? 'نظر ناشناس' : ($review['display_mode'] === 'account' ? 'حساب کاربری' : 'نام نمایشی'))?></span></div><strong class="review-overall"><?=h((string)$review['overall_score'])?> از ۵</strong></div><p class="review-body"><?=nl2br(h($review['body']))?></p><div class="review-meta"><?php if ($review['course_name']): ?><span><?=h($review['course_name'])?></span><?php endif; ?><?php if ($review['term_label']): ?><span><?=h($review['term_label'])?></span><?php endif; ?><span><?=$review['recommended'] ? 'پیشنهاد می‌کند' : 'پیشنهاد نمی‌کند'?></span><span><?=h(substr((string)$review['created_at'], 0, 10))?></span></div><div class="review-actions"><span>امتیاز مفیدبودن: <?=h((string)$review['helpful_score'])?></span><a href="./#professor=<?=(int)$id?>">رأی یا گزارش</a></div></article><?php endforeach; ?></div></section>
<aside class="legal-note">این سایت وابسته به دانشگاه اصفهان نیست. <a href="community-guidelines.php">قواعد انتشار</a> و <a href="privacy.php">حریم خصوصی</a> را ببینید.</aside></div></main></body></html>
