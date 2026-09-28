<?php
declare(strict_types=1);

// Included by mysql.php while connection-local temporary tables are active.
$router = new \CaseFlow\Http\Router($container, require __DIR__ . '/../routes/api.php');
$attachments = $container->get(\CaseFlow\DataAccess\Contracts\AttachmentRepository::class);
$original = $users->find($id);
$other = $users->findByEmail('second@example.test');
$png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=');
$attachments->add(['id' => 'FILE-avatar-route', 'caseId' => null, 'userId' => $id, 'name' => 'avatar.png', 'mime' => 'image/png', 'size' => strlen($png), 'content' => $png, 'date' => '2026-01-02 03:04:05']);
$users->save(array_merge($original, ['avatarId' => 'FILE-avatar-route']));
$users->save(array_merge($other, ['role' => 'Admin']));
$signIn = static function (array $actor): void {
    $_SESSION = ['userId' => $actor['id'], 'version' => $actor['sessionVersion'], 'expires' => time() + 3600];
};
$readAvatar = static function () use ($router, $id, $png): void {
    ob_start();
    try {
        $result = $router->dispatch('GET', '/api/users/' . $id . '/avatar', []);
        $bytes = ob_get_contents();
    } finally { ob_end_clean(); }
    verify($result === null && $bytes === $png, 'Avatar route returns exact image bytes.');
};
try {
    $_SESSION = [];
    unavailable(fn() => $router->dispatch('GET', '/api/users/' . $id . '/avatar', []), 401);
    $signIn($other);
    $readAvatar(); // Admin cross-user read.
    unavailable(fn() => $router->dispatch('GET', '/api/users/' . $other['id'] . '/avatar', []), 404);
    unavailable(fn() => $router->dispatch('GET', '/api/users/invalid/avatar', []), 404);
    unavailable(fn() => $router->dispatch('GET', '/api/users/FILE-avatar-route/avatar', []), 404);
    unavailable(fn() => $router->dispatch('GET', '/api/attachments/FILE-avatar-route', []), 404);
    $users->save(array_merge($original, ['avatarId' => 'FILE-missing']));
    unavailable(fn() => $router->dispatch('GET', '/api/users/' . $id . '/avatar', []), 404);
    $users->save(array_merge($original, ['avatarId' => 'FILE-permission-test']));
    unavailable(fn() => $router->dispatch('GET', '/api/users/' . $id . '/avatar', []), 404);
    $users->save(array_merge($original, ['avatarId' => 'FILE-avatar-route']));
    $signIn($original);
    $readAvatar(); // Normal user self read.
    unavailable(fn() => $router->dispatch('GET', '/api/users/' . $other['id'] . '/avatar', []), 403);
    ob_start();
    $router->dispatch('GET', '/api/attachments/FILE-avatar-route', []);
    verify(ob_get_clean() === $png, 'Owner retains generic attachment access.');
    $users->save(array_merge($original, ['role' => 'Demo Viewer', 'avatarId' => 'FILE-avatar-route']));
    foreach (['/api/users/' . $id . '/avatar', '/api/users/' . $other['id'] . '/avatar', '/api/attachments/FILE-avatar-route', '/api/attachments/FILE-permission-test'] as $path) {
        unavailable(fn() => $router->dispatch('GET', $path, []), 403);
    }
} finally {
    $users->save($original);
    $users->save($other);
    $_SESSION = [];
}
