<?php
declare(strict_types=1);

final class Security
{
    public static function session(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        session_name((string) Config::get('session_name', 'ui_reviews_session'));
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }

    public static function csrfToken(): string
    {
        self::session();
        if (!isset($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(24));
        }
        return $_SESSION['csrf'];
    }

    public static function verifyCsrf(array $input): void
    {
        $sent = (string) ($input['csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''));
        if ($sent === '' || !hash_equals(self::csrfToken(), $sent)) {
            Http::json(['error' => 'csrf_failed'], 403);
        }
    }

    public static function clientIp(): string
    {
        $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
        if (Config::get('trust_cloudflare_ip_header', false)) {
            $candidate = (string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? '');
            if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                return $candidate;
            }
        }
        return filter_var($remote, FILTER_VALIDATE_IP) ? $remote : '0.0.0.0';
    }

    public static function identityHash(string $scope = 'abuse'): string
    {
        $agent = mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 256);
        $material = self::clientIp() . '|' . $agent;
        return hash_hmac('sha256', $scope . '|' . $material, Config::requireSecret('app_key'));
    }

    public static function normalizeText(string $value): string
    {
        $value = strip_tags($value);
        $value = preg_replace('/[\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2060}-\x{2069}]/u', '', $value) ?? $value;
        $value = preg_replace('/[ \t]+/u', ' ', $value) ?? $value;
        $value = preg_replace('/\R{3,}/u', "\n\n", $value) ?? $value;
        return trim($value);
    }

    public static function moderationRisk(string $text): array
    {
        $reasons = [];
        if (preg_match('/(?:\+?98|0)?9\d{9}/u', $text)) $reasons[] = 'phone';
        if (preg_match('/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/iu', $text)) $reasons[] = 'email';
        if (preg_match_all('~https?://|www\.~iu', $text) > 2) $reasons[] = 'link_spam';
        if (preg_match('/(?:می.?کشمت|بکش(?:م|مت)|تهدید|kill\s+you|hurt\s+you)/iu', $text)) $reasons[] = 'threat';
        if (preg_match('/(.)\1{9,}/u', $text)) $reasons[] = 'repetition';
        return array_values(array_unique($reasons));
    }

    public static function rateLimit(string $action, int $limit, int $windowSeconds): void
    {
        $pdo = Database::connection();
        $identity = self::identityHash('rate:' . $action);
        $bucket = intdiv(time(), $windowSeconds) * $windowSeconds;
        $pdo->beginTransaction();
        try {
            $select = $pdo->prepare('SELECT attempts FROM rate_limits WHERE action = ? AND identity_hash = ? AND window_start = ?');
            $select->execute([$action, $identity, $bucket]);
            $attempts = $select->fetchColumn();
            if ($attempts === false) {
                try {
                    $insert = $pdo->prepare('INSERT INTO rate_limits (action, identity_hash, window_start, attempts, expires_at) VALUES (?, ?, ?, 1, ?)');
                    $insert->execute([$action, $identity, $bucket, gmdate('Y-m-d H:i:s', $bucket + $windowSeconds * 2)]);
                    $attempts = 1;
                } catch (PDOException) {
                    $select->execute([$action, $identity, $bucket]);
                    $attempts = (int) $select->fetchColumn();
                }
            } else {
                $attempts = (int) $attempts + 1;
                $update = $pdo->prepare('UPDATE rate_limits SET attempts = ? WHERE action = ? AND identity_hash = ? AND window_start = ?');
                $update->execute([$attempts, $action, $identity, $bucket]);
            }
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        if ((int) $attempts > $limit) {
            header('Retry-After: ' . $windowSeconds);
            Http::json(['error' => 'rate_limited'], 429);
        }
        if (random_int(1, 100) === 1) {
            $cleanup = $pdo->prepare('DELETE FROM rate_limits WHERE expires_at < ?');
            $cleanup->execute([gmdate('Y-m-d H:i:s')]);
        }
    }
}
