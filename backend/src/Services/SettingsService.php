<?php
declare(strict_types=1);

namespace CaseFlow\Services;

use CaseFlow\Authentication\Session;
use CaseFlow\DataAccess\Contracts\CaseRepository;
use CaseFlow\DataAccess\Contracts\UnitOfWork;
use CaseFlow\DataAccess\Contracts\UserRepository;
use CaseFlow\Http\HttpError;
use CaseFlow\Validation\Validator;

final class SettingsService
{
    private UserRepository $users;
    private CaseRepository $cases;
    private UnitOfWork $transactions;

    public function __construct(UserRepository $users, CaseRepository $cases, UnitOfWork $transactions)
    {
        $this->users = $users;
        $this->cases = $cases;
        $this->transactions = $transactions;
    }

    public function save(array $input, array $user): void
    {
        $originalName = $user['name'];
        $passwordChanged = false;
        foreach (['profile', 'passwords', 'notifications', 'display'] as $section) {
            if (isset($input[$section]) && !is_array($input[$section])) throw new HttpError(422, 'Invalid settings section.');
        }
        if (isset($input['profile'])) {
            $data = Validator::fields($input['profile'], ['name', 'email']);
            if ($this->users->emailExists($data['email'], $user['id'])) throw new HttpError(422, 'Email already in use.');
            $user = array_merge($user, $data);
        }
        if (isset($input['passwords'])) {
            Validator::fields($input['passwords'], ['current', 'next', 'confirm']);
            $passwords = $input['passwords'];
            if (!password_verify($passwords['current'], $user['password'])) throw new HttpError(422, 'Current password is incorrect.');
            if ($passwords['next'] !== $passwords['confirm']) throw new HttpError(422, 'Passwords do not match.');
            Validator::password($passwords['next']);
            $user['password'] = password_hash($passwords['next'], PASSWORD_DEFAULT);
            $user['sessionVersion'] = (int) $user['sessionVersion'] + 1;
            $passwordChanged = true;
        }
        $settings = $user['settings'] ?? [];
        if (isset($input['notifications'])) {
            foreach (['caseAssigned', 'caseUpdated', 'caseResolved', 'digest'] as $key) {
                if (!isset($input['notifications'][$key]) || !is_bool($input['notifications'][$key])) throw new HttpError(422, 'Invalid notification preference.');
                $settings['notifications'][$key] = $input['notifications'][$key];
            }
        }
        if (isset($input['display'])) {
            $display = Validator::fields($input['display'], ['density', 'timezone'], ['theme']);
            Validator::choice('density', $display['density'], ['compact', 'comfortable', 'spacious']);
            Validator::choice('timezone', $display['timezone'], \DateTimeZone::listIdentifiers());
            $settings['display'] = $display;
        }
        $user['settings'] = $settings;
        $this->transactions->run(function () use ($user, $originalName): void {
            $this->users->save($user);
            if ($originalName !== $user['name']) $this->cases->renameAgent($originalName, $user['name']);
        });
        if ($passwordChanged) Session::refreshVersion($user['sessionVersion']);
    }
}
