<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/app/bootstrap.php';
Security::session();

function ah(?string $value): string { return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function redirectAdmin(string $suffix = ''): never { header('Location: index.php' . $suffix, true, 303); exit; }

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $intent = (string) ($_POST['intent'] ?? '');
    if ($intent === 'login') {
        Security::rateLimit('admin_login_15m', 8, 900);
        $hash = (string) Config::get('admin_password_hash', '');
        if ($hash !== '' && !str_contains($hash, 'CHANGE_ME') && password_verify((string) ($_POST['password'] ?? ''), $hash)) {
            session_regenerate_id(true);
            $_SESSION['admin_authenticated'] = true;
            $_SESSION['admin_csrf'] = bin2hex(random_bytes(24));
            redirectAdmin();
        }
        $error = 'رمز مدیریت نادرست است.';
    } elseif (!empty($_SESSION['admin_authenticated'])) {
        $sent = (string) ($_POST['csrf'] ?? '');
        if (!hash_equals((string) ($_SESSION['admin_csrf'] ?? ''), $sent)) {
            http_response_code(403); exit('CSRF failed');
        }
        if ($intent === 'logout') {
            $_SESSION = []; session_destroy(); redirectAdmin();
        }
        $pdo = Database::connection();
        if ($intent === 'moderate') {
            $reviewId = filter_var($_POST['review_id'] ?? null, FILTER_VALIDATE_INT);
            $action = (string) ($_POST['action'] ?? '');
            $reason = Security::normalizeText((string) ($_POST['reason'] ?? ''));
            $targets = ['publish' => 'published', 'hide' => 'hidden', 'reject' => 'rejected'];
            if (!$reviewId || !isset($targets[$action]) || mb_strlen($reason) < 5 || mb_strlen($reason) > 255) {
                $error = 'اقدام یا دلیل معتبر نیست.';
            } else {
                $current = $pdo->prepare('SELECT professor_id, status FROM reviews WHERE id = ?');
                $current->execute([$reviewId]);
                $review = $current->fetch();
                if ($review) {
                    $newStatus = $targets[$action];
                    $pdo->beginTransaction();
                    $update = $pdo->prepare('UPDATE reviews SET status = ?, published_at = CASE WHEN ? = \'published\' THEN COALESCE(published_at, ?) ELSE published_at END, updated_at = ? WHERE id = ?');
                    $now = gmdate('Y-m-d H:i:s');
                    $update->execute([$newStatus, $newStatus, $now, $now, $reviewId]);
                    $log = $pdo->prepare('INSERT INTO moderation_actions (review_id, action, reason, previous_status, new_status, admin_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
                    $adminHash = hash_hmac('sha256', session_id(), Config::requireSecret('app_key'));
                    $log->execute([$reviewId, $action, $reason, $review['status'], $newStatus, $adminHash, $now]);
                    $resolve = $pdo->prepare("UPDATE reports SET status = 'resolved', resolved_at = ? WHERE review_id = ? AND status = 'open'");
                    $resolve->execute([$now, $reviewId]);
                    $pdo->commit();
                    ReviewService::rebuildProfessorStats((int) $review['professor_id']);
                    redirectAdmin('?saved=1');
                }
            }
        }
        if ($intent === 'professor_save') {
            $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            $departmentId = filter_var($_POST['department_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            $name = Security::normalizeText((string) ($_POST['name_fa'] ?? ''));
            $rank = Security::normalizeText((string) ($_POST['academic_rank'] ?? ''));
            $url = trim((string) ($_POST['official_profile_url'] ?? ''));
            $active = isset($_POST['is_active']) ? 1 : 0;
            if (!$id || !$departmentId || mb_strlen($name) < 3 || mb_strlen($name) > 180 || ($url !== '' && (!filter_var($url, FILTER_VALIDATE_URL) || parse_url($url, PHP_URL_SCHEME) !== 'https'))) {
                $error = 'اطلاعات استاد معتبر نیست.';
            } else {
                $exists = $pdo->prepare('SELECT id FROM professors WHERE id = ?');
                $exists->execute([$id]);
                $now = gmdate('Y-m-d H:i:s');
                if ($exists->fetchColumn()) {
                    $save = $pdo->prepare('UPDATE professors SET department_id = ?, name_fa = ?, academic_rank = ?, official_profile_url = ?, is_active = ?, updated_at = ? WHERE id = ?');
                    $save->execute([$departmentId, $name, $rank ?: null, $url ?: null, $active, $now, $id]);
                } else {
                    $save = $pdo->prepare('INSERT INTO professors (id, department_id, name_fa, academic_rank, official_profile_url, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                    $save->execute([$id, $departmentId, $name, $rank ?: null, $url ?: null, $active, $now, $now]);
                }
                redirectAdmin('?professor_saved=1');
            }
        }
    }
}

$authenticated = !empty($_SESSION['admin_authenticated']);
if (!$authenticated): ?>
<!doctype html><html lang="fa" dir="rtl" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ورود مدیریت</title><link rel="stylesheet" href="../assets/css/app.css"><link rel="stylesheet" href="../assets/css/fonts.css"></head><body><main class="admin-login"><form method="post"><h1>مدیریت سامانه</h1><p>ورود فقط برای بررسی گزارش‌های تخلف و اصلاح اطلاعات است.</p><?php if ($error): ?><div class="admin-error"><?=ah($error)?></div><?php endif; ?><input type="hidden" name="intent" value="login"><label>رمز مدیریت<input type="password" name="password" autocomplete="current-password" required></label><button type="submit">ورود امن</button></form></main></body></html><?php exit; endif;

$pdo = Database::connection();
$summary = $pdo->query("SELECT (SELECT COUNT(*) FROM professors WHERE is_active = 1) professors, (SELECT COUNT(*) FROM reviews WHERE status = 'published') published, (SELECT COUNT(*) FROM reviews WHERE status = 'pending') pending, (SELECT COUNT(*) FROM reports WHERE status = 'open') open_reports")->fetch();
$queue = $pdo->query("SELECT r.id, r.professor_id, r.display_mode, r.display_name, r.body, r.course_name, r.status, r.moderation_flags, r.created_at, p.name_fa, COUNT(rep.id) AS report_count FROM reviews r JOIN professors p ON p.id = r.professor_id LEFT JOIN reports rep ON rep.review_id = r.id AND rep.status = 'open' WHERE r.status = 'pending' OR rep.id IS NOT NULL GROUP BY r.id, r.professor_id, r.display_mode, r.display_name, r.body, r.course_name, r.status, r.moderation_flags, r.created_at, p.name_fa ORDER BY report_count DESC, r.created_at ASC LIMIT 100")->fetchAll();
$departments = $pdo->query('SELECT d.id, d.name, f.name AS faculty FROM departments d JOIN faculties f ON f.id = d.faculty_id ORDER BY f.name, d.name')->fetchAll();
$changes = $pdo->query("SELECT id, professor_id, request_type, details, created_at FROM professor_change_requests WHERE status = 'open' ORDER BY created_at ASC LIMIT 30")->fetchAll();
$csrf = (string) $_SESSION['admin_csrf'];
?>
<!doctype html><html lang="fa" dir="rtl" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>پنل مدیریت</title><link rel="stylesheet" href="../assets/css/app.css"><link rel="stylesheet" href="../assets/css/fonts.css"></head><body><main class="admin-page"><div class="admin-shell"><header><div><h1>پنل مدیریت سبک</h1><p>انتقاد و امتیاز پایین دلیل حذف نیست.</p></div><form method="post"><input type="hidden" name="intent" value="logout"><input type="hidden" name="csrf" value="<?=ah($csrf)?>"><button>خروج</button></form></header><?php if ($error): ?><div class="admin-error"><?=ah($error)?></div><?php endif; ?><section class="admin-stats"><?php foreach (['professors'=>'استاد فعال','published'=>'نظر منتشرشده','pending'=>'در انتظار بررسی','open_reports'=>'گزارش باز'] as $key=>$label): ?><div><b><?=ah((string)$summary[$key])?></b><span><?=$label?></span></div><?php endforeach; ?></section>
<section><h2>صف بررسی</h2><?php if (!$queue): ?><div class="empty">صف بررسی خالی است.</div><?php endif; ?><div class="moderation-list"><?php foreach ($queue as $item): ?><article><div class="moderation-head"><div><b><?=ah($item['name_fa'])?></b><span>#<?=ah((string)$item['id'])?> · <?=ah($item['status'])?> · <?=ah((string)$item['report_count'])?> گزارش</span></div><a href="../professor.php?id=<?=ah((string)$item['professor_id'])?>" target="_blank" rel="noopener">صفحه استاد</a></div><p><?=nl2br(ah($item['body']))?></p><?php if ($item['moderation_flags']): ?><code><?=ah($item['moderation_flags'])?></code><?php endif; ?><form class="moderation-form" method="post"><input type="hidden" name="intent" value="moderate"><input type="hidden" name="csrf" value="<?=ah($csrf)?>"><input type="hidden" name="review_id" value="<?=ah((string)$item['id'])?>"><input name="reason" minlength="5" maxlength="255" required placeholder="دلیل مستند اقدام"><button name="action" value="publish">انتشار</button><button name="action" value="hide">پنهان‌کردن تخلف</button><button name="action" value="reject">رد محتوای غیرمجاز</button></form></article><?php endforeach; ?></div></section>
<section><h2>افزودن یا ویرایش استاد</h2><form class="professor-admin-form" method="post"><input type="hidden" name="intent" value="professor_save"><input type="hidden" name="csrf" value="<?=ah($csrf)?>"><label>شناسه استاد<input type="number" name="id" min="1" required></label><label>نام و نام خانوادگی<input name="name_fa" maxlength="180" required></label><label>دانشکده / گروه<select name="department_id" required><option value="">انتخاب…</option><?php foreach ($departments as $department): ?><option value="<?=ah((string)$department['id'])?>"><?=ah($department['faculty'] . ' — ' . $department['name'])?></option><?php endforeach; ?></select></label><label>مرتبه علمی<input name="academic_rank" maxlength="100"></label><label>پروفایل رسمی HTTPS<input type="url" name="official_profile_url"></label><label class="inline-check"><input type="checkbox" name="is_active" checked> فعال</label><button>ذخیره بدون حذف تاریخچه</button></form></section>
<section><h2>درخواست‌های اصلاح</h2><div class="change-list"><?php if (!$changes): ?><div class="empty">درخواستی وجود ندارد.</div><?php endif; ?><?php foreach ($changes as $change): ?><article><b><?=ah($change['request_type'])?> · #<?=ah((string)$change['id'])?></b><p><?=nl2br(ah($change['details']))?></p><small><?=ah($change['created_at'])?></small></article><?php endforeach; ?></div></section></div></main></body></html>
