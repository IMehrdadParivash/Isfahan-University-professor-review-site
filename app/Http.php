<?php
declare(strict_types=1);

final class Http
{
    public static function securityHeaders(): void
    {
        header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
        header('Cross-Origin-Resource-Policy: same-origin');
    }

    public static function json(mixed $payload, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        if (!array_filter(headers_list(), static fn(string $header): bool => str_starts_with(strtolower($header), 'cache-control:'))) {
            header('Cache-Control: no-store');
        }
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        exit;
    }

    public static function input(int $maxBytes = 24576): array
    {
        $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($length > $maxBytes) {
            self::json(['error' => 'payload_too_large'], 413);
        }
        $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
        if ($raw === false || strlen($raw) > $maxBytes) {
            self::json(['error' => 'payload_too_large'], 413);
        }
        try {
            $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            self::json(['error' => 'invalid_json'], 400);
        }
        if (!is_array($data)) {
            self::json(['error' => 'invalid_json'], 400);
        }
        return $data;
    }

    public static function method(string $expected): void
    {
        if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== strtoupper($expected)) {
            header('Allow: ' . strtoupper($expected));
            self::json(['error' => 'method_not_allowed'], 405);
        }
    }
}
