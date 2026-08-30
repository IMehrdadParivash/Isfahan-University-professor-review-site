<?php
declare(strict_types=1);

final class Config
{
    private static array $values = [];

    public static function load(string $root): void
    {
        $file = $root . '/config.php';
        $values = is_file($file) ? require $file : [];
        if (!is_array($values)) {
            throw new RuntimeException('config.php must return an array');
        }
        self::$values = $values;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return self::$values[$key] ?? $default;
    }

    public static function requireSecret(string $key): string
    {
        $value = (string) self::get($key, '');
        if ($value === '' || str_contains($value, 'CHANGE_ME') || strlen($value) < 32) {
            throw new RuntimeException("Missing secure configuration: {$key}");
        }
        return $value;
    }
}
