<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

try {
    $route = (string) ($_GET['route'] ?? 'health');
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

    if ($route === 'health' && $method === 'GET') {
        Database::connection()->query('SELECT 1');
        Http::json(['ok' => true]);
    }

    if ($route === 'csrf' && $method === 'GET') {
        Http::json(['csrf' => Security::csrfToken(), 'accounts_enabled' => (bool) Config::get('accounts_enabled', false)]);
    }

    if ($route === 'reviews' && $method === 'GET') {
        $professorId = filter_var($_GET['professor_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if (!$professorId) Http::json(['error' => 'invalid_professor'], 422);
        Http::json(ReviewService::listForProfessor((int) $professorId, $_GET));
    }

    if ($route === 'reviews' && $method === 'POST') {
        $input = Http::input();
        Security::verifyCsrf($input);
        Http::json(ReviewService::create($input), 201);
    }

    if ($route === 'vote' && $method === 'POST') {
        $input = Http::input(4096);
        Security::verifyCsrf($input);
        $reviewId = filter_var($input['review_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        Http::json(ReviewService::vote((int) $reviewId, (int) ($input['value'] ?? 0)));
    }

    if ($route === 'report' && $method === 'POST') {
        $input = Http::input(4096);
        Security::verifyCsrf($input);
        $reviewId = filter_var($input['review_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if (!$reviewId) Http::json(['error' => 'invalid_review'], 422);
        Http::json(ReviewService::report((int) $reviewId, $input), 201);
    }

    if ($route === 'professor-stats' && $method === 'GET') {
        header('Cache-Control: public, max-age=300, stale-while-revalidate=300');
        $rows = Database::connection()->query('SELECT professor_id, review_count, avg_overall, recommend_percent, stats_json, updated_at FROM professor_stats WHERE review_count > 0')->fetchAll();
        foreach ($rows as &$row) {
            $row['professor_id'] = (int) $row['professor_id'];
            $row['review_count'] = (int) $row['review_count'];
            $row['avg_overall'] = $row['avg_overall'] === null ? null : (float) $row['avg_overall'];
            $row['recommend_percent'] = $row['recommend_percent'] === null ? null : (float) $row['recommend_percent'];
            $row['stats'] = json_decode((string) $row['stats_json'], true);
            unset($row['stats_json']);
        }
        unset($row);
        Http::json(['professors' => $rows]);
    }

    if ($route === 'change-request' && $method === 'POST') {
        $input = Http::input(8192);
        Security::verifyCsrf($input);
        Security::rateLimit('change_request_day', 5, 86400);
        $professorId = filter_var($input['professor_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) ?: null;
        $type = (string) ($input['request_type'] ?? 'correction');
        if (!in_array($type, ['correction', 'new_professor', 'merge', 'course'], true)) $type = 'correction';
        $details = Security::normalizeText((string) ($input['details'] ?? ''));
        if (mb_strlen($details) < 10 || mb_strlen($details) > 2000) Http::json(['error' => 'invalid_details'], 422);
        $statement = Database::connection()->prepare("INSERT INTO professor_change_requests (professor_id, requester_hash, request_type, details, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)");
        $statement->execute([$professorId, Security::identityHash('change:v1'), $type, $details, gmdate('Y-m-d H:i:s')]);
        Http::json(['accepted' => true], 201);
    }

    if ($route === 'auth/register' && $method === 'POST') {
        if (!Config::get('accounts_enabled', false)) Http::json(['error' => 'accounts_disabled'], 404);
        $input = Http::input(8192);
        Security::verifyCsrf($input);
        Security::rateLimit('register_day', 3, 86400);
        $username = mb_strtolower(trim((string) ($input['username'] ?? '')));
        $displayName = Security::normalizeText((string) ($input['display_name'] ?? ''));
        $password = (string) ($input['password'] ?? '');
        if (!preg_match('/^[\p{L}\p{N}_]{3,30}$/u', $username) || mb_strlen($displayName) < 2 || mb_strlen($displayName) > 80 || strlen($password) < 10 || strlen($password) > 200) {
            Http::json(['error' => 'invalid_account'], 422);
        }
        $statement = Database::connection()->prepare("INSERT INTO users (username, display_name, password_hash, status, created_at) VALUES (?, ?, ?, 'active', ?)");
        try {
            $statement->execute([$username, $displayName, password_hash($password, PASSWORD_DEFAULT), gmdate('Y-m-d H:i:s')]);
        } catch (PDOException) {
            Http::json(['error' => 'username_unavailable'], 409);
        }
        Security::session();
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) Database::connection()->lastInsertId();
        Http::json(['authenticated' => true], 201);
    }

    if ($route === 'auth/login' && $method === 'POST') {
        if (!Config::get('accounts_enabled', false)) Http::json(['error' => 'accounts_disabled'], 404);
        $input = Http::input(4096);
        Security::verifyCsrf($input);
        Security::rateLimit('login_15m', 10, 900);
        $username = mb_strtolower(trim((string) ($input['username'] ?? '')));
        $statement = Database::connection()->prepare("SELECT id, display_name, password_hash FROM users WHERE username = ? AND status = 'active'");
        $statement->execute([$username]);
        $user = $statement->fetch();
        if (!$user || !password_verify((string) ($input['password'] ?? ''), (string) $user['password_hash'])) {
            Http::json(['error' => 'invalid_credentials'], 401);
        }
        Security::session();
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['id'];
        $update = Database::connection()->prepare('UPDATE users SET last_login_at = ? WHERE id = ?');
        $update->execute([gmdate('Y-m-d H:i:s'), (int) $user['id']]);
        Http::json(['authenticated' => true, 'display_name' => $user['display_name']]);
    }

    if ($route === 'auth/me' && $method === 'GET') {
        Security::session();
        $userId = (int) ($_SESSION['user_id'] ?? 0);
        if (!$userId) Http::json(['authenticated' => false]);
        $statement = Database::connection()->prepare("SELECT id, username, display_name FROM users WHERE id = ? AND status = 'active'");
        $statement->execute([$userId]);
        Http::json(['authenticated' => (bool) ($user = $statement->fetch()), 'user' => $user ?: null]);
    }

    if ($route === 'auth/logout' && $method === 'POST') {
        $input = Http::input(4096);
        Security::verifyCsrf($input);
        Security::session();
        $_SESSION = [];
        session_destroy();
        Http::json(['authenticated' => false]);
    }

    Http::json(['error' => 'not_found'], 404);
} catch (Throwable $error) {
    error_log($error->__toString());
    $message = Config::get('environment') === 'development' ? $error->getMessage() : 'خطای موقت سرور';
    Http::json(['error' => 'server_error', 'message' => $message], 500);
}
