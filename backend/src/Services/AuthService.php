<?php
declare(strict_types=1);

namespace CaseFlow\Services;

use CaseFlow\Authentication\Session;
use CaseFlow\DataAccess\Contracts\LoginAttemptRepository;
use CaseFlow\DataAccess\Contracts\UserRepository;
use CaseFlow\Http\HttpError;
use CaseFlow\Validation\Validator;

final class AuthService
{
    private UserRepository $users;
    private LoginAttemptRepository $attempts;

    public function __construct(UserRepository $users, LoginAttemptRepository $attempts)
    {
        $this->users = $users;
        $this->attempts = $attempts;
    }

    public static function publicUser(array $user): array
    {
        return [
            'id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'],
            'role' => $user['role'], 'avatarId' => $user['avatarId'] ?? null,
            'settings' => (object) ($user['settings'] ?? []),
        ];
    }

    public function currentUser(): array
    {
        $user = $this->users->find($_SESSION['userId'] ?? '');
        if (!$user || ($_SESSION['expires'] ?? 0) < time() || (int) $user['sessionVersion'] !== (int) ($_SESSION['version'] ?? 0)) {
            unset($_SESSION['userId']);
            throw new HttpError(401, 'Please sign in.');
        }
        return $user;
    }

    public function login(array $input): array
    {
        $values = Validator::fields($input, ['email', 'password']);
        $key = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'cli') . strtolower($values['email']));
        if ($this->attempts->countSince($key, time()) >= 5) throw new HttpError(429, 'Too many attempts. Try again in 15 minutes.');
        $user = $this->users->findByEmail($values['email']);
        $valid = password_verify($input['password'], $user['password'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
        if (!$user || !$valid) {
            $this->attempts->recordFailure($key, time() + 900);
            throw new HttpError(401, 'Incorrect email or password.');
        }
        $this->attempts->clear($key);
        Session::establish($user, ($input['remember'] ?? false) === true);
        return ['user' => self::publicUser($user), 'csrf' => $_SESSION['csrf']];
    }
}
