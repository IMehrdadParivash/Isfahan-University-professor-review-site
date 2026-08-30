<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once dirname(__DIR__) . '/app/bootstrap.php';

$pdo = Database::connection();
$driver = Database::driver();
$schema = APP_ROOT . '/database/schema.' . ($driver === 'sqlite' ? 'sqlite' : 'mysql') . '.sql';
if (!is_file($schema)) throw new RuntimeException('Schema not found');

if ($driver === 'mysql') {
    $sql = file_get_contents($schema);
    foreach (preg_split('/;\s*(?:\R|$)/', (string) $sql) as $statement) {
        $statement = trim($statement);
        if ($statement !== '') $pdo->exec($statement);
    }
} else {
    $pdo->exec((string) file_get_contents($schema));
}

$encoded = '';
foreach (glob(APP_ROOT . '/assets/data/professors-*.js') ?: [] as $file) {
    $text = (string) file_get_contents($file);
    if (!preg_match('/\["([A-Za-z0-9+\/=]+)"\]/', $text, $match)) throw new RuntimeException("Invalid data chunk: {$file}");
    $encoded .= $match[1];
}
$compressed = base64_decode($encoded, true);
$json = $compressed === false ? false : gzdecode($compressed);
$data = $json === false ? null : json_decode($json, true, 64, JSON_THROW_ON_ERROR);
if (!is_array($data) || !isset($data['p'])) throw new RuntimeException('Professor dataset could not be decoded');

function slugify(string $value): string {
    $value = preg_replace('/[^\p{L}\p{N}]+/u', '-', trim($value)) ?? $value;
    return trim(mb_strtolower($value), '-');
}

$facultySelect = $pdo->prepare('SELECT id FROM faculties WHERE name = ?');
$facultyInsert = $pdo->prepare('INSERT INTO faculties (name, slug) VALUES (?, ?)');
$departmentSelect = $pdo->prepare('SELECT id FROM departments WHERE faculty_id = ? AND name = ?');
$departmentInsert = $pdo->prepare('INSERT INTO departments (faculty_id, name, slug) VALUES (?, ?, ?)');
$professorSelect = $pdo->prepare('SELECT id FROM professors WHERE id = ?');
$professorInsert = $pdo->prepare('INSERT INTO professors (id, department_id, name_fa, academic_rank, official_profile_url, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)');
$professorUpdate = $pdo->prepare('UPDATE professors SET department_id = ?, name_fa = ?, academic_rank = ?, official_profile_url = ?, is_active = 1, updated_at = ? WHERE id = ?');
$courseSelect = $pdo->prepare('SELECT id FROM courses WHERE normalized_name = ?');
$courseInsert = $pdo->prepare('INSERT INTO courses (name, normalized_name) VALUES (?, ?)');
$linkInsert = $pdo->prepare($driver === 'sqlite' ? 'INSERT OR IGNORE INTO professor_courses (professor_id, course_id) VALUES (?, ?)' : 'INSERT IGNORE INTO professor_courses (professor_id, course_id) VALUES (?, ?)');
$now = gmdate('Y-m-d H:i:s');

$pdo->beginTransaction();
foreach ($data['p'] as $entry) {
    [$id, $name, $rank, $facultyName, $departmentName, $url] = $entry;
    $facultySelect->execute([$facultyName]);
    $facultyId = $facultySelect->fetchColumn();
    if (!$facultyId) { $facultyInsert->execute([$facultyName, slugify($facultyName)]); $facultyId = $pdo->lastInsertId(); }
    $departmentSelect->execute([$facultyId, $departmentName]);
    $departmentId = $departmentSelect->fetchColumn();
    if (!$departmentId) { $departmentInsert->execute([$facultyId, $departmentName, slugify($facultyName . '-' . $departmentName)]); $departmentId = $pdo->lastInsertId(); }
    $professorSelect->execute([$id]);
    if ($professorSelect->fetchColumn()) $professorUpdate->execute([$departmentId, $name, $rank ?: null, $url ?: null, $now, $id]);
    else $professorInsert->execute([$id, $departmentId, $name, $rank ?: null, $url ?: null, $now, $now]);
    foreach ($entry[7] ?? [] as $course) {
        $courseName = trim((string) ($course[0] ?? ''));
        if ($courseName === '') continue;
        $normalized = mb_strtolower(preg_replace('/\s+/u', ' ', $courseName) ?? $courseName);
        $courseSelect->execute([$normalized]);
        $courseId = $courseSelect->fetchColumn();
        if (!$courseId) { $courseInsert->execute([$courseName, $normalized]); $courseId = $pdo->lastInsertId(); }
        $linkInsert->execute([$id, $courseId]);
    }
}
$pdo->commit();
fwrite(STDOUT, 'Installed schema and imported ' . count($data['p']) . " professors.\n");
