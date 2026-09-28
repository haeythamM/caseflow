<?php
declare(strict_types=1);

namespace CaseFlow\Middleware;

use CaseFlow\Http\HttpError;

final class AuthorizeDemoViewer
{
    public function handle(string $method, string $path, array $user): void
    {
        if (!in_array($user['role'] ?? '', ['Admin', 'Support Agent', 'Demo Viewer'], true)) {
            throw new HttpError(403, 'This account has no permitted application role.');
        }
        if (($user['role'] ?? '') !== 'Demo Viewer') return;

        // Applied to authenticated application routes, after the existing CSRF/session checks.
        if (!in_array($method, ['GET', 'HEAD'], true)
            || preg_match('#^/api/(?:users|settings|avatar)(?:/|$)#', $path)
            || preg_match('#/attachments(?:/|$)#', $path)) {
            throw new HttpError(403, 'Demo Viewer access is read-only. This action is not permitted.');
        }
    }
}
