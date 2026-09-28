<?php
declare(strict_types=1);

namespace CaseFlow\Authentication;

use CaseFlow\Http\HttpError;

final class Session
{
    public static function start(): void
    {
        $sessionPath = getenv('CASEFLOW_SESSION_PATH') ?: dirname(__DIR__, 2) . '/storage/sessions';
        if (!is_dir($sessionPath)) mkdir($sessionPath, 0700, true);
        session_save_path($sessionPath);
        ini_set('session.use_strict_mode', '1');
        ini_set('session.gc_maxlifetime', '2592000');
        session_name('caseflow_session');
        session_set_cookie_params([
            'httponly' => true, 'samesite' => 'Lax', 'path' => '/',
            'secure' => getenv('CASEFLOW_SECURE_COOKIE') === '1',
        ]);
        if (!session_start()) throw new \RuntimeException('Session storage is unavailable.');
        if (!isset($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }


    public static function establish(array $user, bool $remember): void
    {
        session_regenerate_id(true);
        $duration = $remember ? 2592000 : 28800;
        $_SESSION['userId'] = $user['id'];
        $_SESSION['version'] = (int) $user['sessionVersion'];
        $_SESSION['expires'] = time() + $duration;
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        $cookie = session_get_cookie_params();
        unset($cookie['lifetime']);
        setcookie(session_name(), session_id(), array_merge($cookie, ['expires' => $remember ? time() + $duration : 0]));
    }

    public static function refreshVersion(int $version): void
    {
        $_SESSION['version'] = $version;
        session_regenerate_id(true);
    }

    public static function csrf(): void
    {
        if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) throw new HttpError(419, 'Session expired. Reload the page and try again.');
    }

    public static function logout(): void
    {
        $_SESSION = [];
        $cookie = session_get_cookie_params();
        unset($cookie['lifetime']);
        setcookie(session_name(), '', array_merge($cookie, ['expires' => time() - 3600]));
        session_destroy();
    }
}

