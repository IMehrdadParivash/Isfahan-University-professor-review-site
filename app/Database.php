<?php
declare(strict_types=1);

final class Database
{
    private static ?PDO $pdo = null;

    public static function connection(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }
        $dsn = (string) Config::get('db_dsn', '');
        if ($dsn === '') {
            throw new RuntimeException('Database is not configured');
        }
        self::$pdo = new PDO(
            $dsn,
            (string) Config::get('db_user', ''),
            (string) Config::get('db_pass', ''),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
            ]
        );
        return self::$pdo;
    }

    public static function driver(): string
    {
        return (string) self::connection()->getAttribute(PDO::ATTR_DRIVER_NAME);
    }
}
