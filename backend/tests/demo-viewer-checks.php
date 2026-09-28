<?php
declare(strict_types=1);

// Included by mysql.php only after its connection-local temporary tables exist.
if (!isset($pdo, $container, $users, $user, $case)) {
    throw new RuntimeException('Run php tests/mysql.php to execute these isolated checks.');
}
$router = new \CaseFlow\Http\Router($container, require __DIR__ . '/../routes/api.php');
$originalUser = $users->find($user['id']);
$attachments = $container->get(\CaseFlow\DataAccess\Contracts\AttachmentRepository::class);
$attachments->add(['id' => 'FILE-permission-test', 'caseId' => $case['id'], 'userId' => $user['id'], 'name' => 'test.txt', 'mime' => 'text/plain', 'size' => 4, 'content' => 'test', 'date' => '2026-01-02 03:04:05']);
$container->get(\CaseFlow\Services\CommunicationService::class)->create(['caseId' => $case['id'], 'type' => 'Internal Note', 'subject' => 'Permission test', 'body' => 'Read-only test data'], $originalUser);
$baseline = $container->get(\CaseFlow\Services\WorkspaceService::class)->read($originalUser);
$users->save(array_merge($originalUser, ['role' => 'Demo Viewer']));
$_SESSION = ['userId' => $user['id'], 'version' => $originalUser['sessionVersion'], 'expires' => time() + 3600, 'csrf' => 'permission-test'];
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'permission-test';
verify($router->dispatch('GET', '/api/auth/me', [])['user']['role'] === 'Demo Viewer', 'Session must recognize Demo Viewer.');
$workspace = $router->dispatch('GET', '/api/workspace', []);
foreach (['customers', 'cases', 'communications', 'caseActivities'] as $key) {
    verify($workspace[$key] == $baseline[$key], 'Demo Viewer reads existing workspace ' . $key);
}
// The application exposes these collections/report inputs through workspace,
// not separate GET collection endpoints. Keep the existing API contract.
$snapshot = static function () use ($pdo): string {
    $rows = [];
    foreach (['users', 'customers', 'cases', 'communications', 'case_activities', 'attachments', 'login_attempts'] as $table) {
        $rows[$table] = $pdo->query("SELECT * FROM `$table` ORDER BY 1")->fetchAll();
    }
    return serialize($rows);
};
$before = $snapshot();
foreach ([
    ['POST', '/api/customers', []],
    ['PATCH', '/api/customers/' . $customer['id'], []],
    ['DELETE', '/api/customers/' . $customer['id'], []],
    ['POST', '/api/cases', []],
    ['PATCH', '/api/cases/' . $case['id'], ['status' => 'Closed']],
    ['PATCH', '/api/cases/' . $case['id'], ['status' => 'Open']],
    ['POST', '/api/cases/' . $case['id'] . '/updates', ['text' => 'Forbidden note']],
    ['POST', '/api/communications', []],
    ['POST', '/api/cases/' . $case['id'] . '/attachments', []],
    ['GET', '/api/attachments/FILE-permission-test', []],
    ['GET', '/api/attachments/missing', []],
    ['GET', '/api/users', []],
    ['PATCH', '/api/settings', ['profile' => ['name' => 'Forbidden', 'email' => 'forbidden@example.test']]],
    ['PATCH', '/api/settings', ['passwords' => ['current' => 'unused', 'next' => 'unused', 'confirm' => 'unused']]],
    ['PATCH', '/api/settings', ['display' => ['density' => 'compact', 'timezone' => 'UTC']]],
    ['POST', '/api/avatar', []],
] as [$method, $path, $input]) {
    unavailable(fn() => $router->dispatch($method, $path, $input), 403);
}
verify($snapshot() === $before, 'Denied Demo Viewer requests must not change any application records.');
unset($_SERVER['HTTP_X_CSRF_TOKEN']);
unavailable(fn() => $router->dispatch('POST', '/api/customers', []), 419);
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'permission-test';
$_SESSION['expires'] = time() - 1;
unavailable(fn() => $router->dispatch('GET', '/api/workspace', []), 401);
$_SESSION['expires'] = time() + 3600;

foreach (['Admin', 'Support Agent'] as $role) {
    $users->save(array_merge($originalUser, ['role' => $role]));
    $created = $router->dispatch('POST', '/api/customers', ['firstName' => 'Permission', 'lastName' => 'Test', 'email' => str_replace(' ', '', $role) . '@example.test', 'phone' => '123', 'status' => 'Active']);
    verify(isset($created['id']), "$role retains customer creation.");
    $router->dispatch('PATCH', '/api/customers/' . $created['id'], ['firstName' => 'Changed']);
    verify($customers->find($created['id'])['firstName'] === 'Changed', "$role retains customer editing.");
    $router->dispatch('DELETE', '/api/customers/' . $created['id'], []);
    verify($customers->find($created['id']) === null, "$role retains customer deletion.");
    $createdCase = $router->dispatch('POST', '/api/cases', ['customerId' => $customer['id'], 'subject' => 'Permission test', 'description' => 'Test', 'status' => 'Open', 'priority' => 'Low']);
    foreach (['Closed', 'Open'] as $status) {
        $router->dispatch('PATCH', '/api/cases/' . $createdCase['id'], ['status' => $status]);
        verify($caseService->find($createdCase['id'])['status'] === $status, "$role retains status changes.");
    }
    $router->dispatch('POST', '/api/cases/' . $createdCase['id'] . '/updates', ['text' => 'Allowed note']);
    $communication = $router->dispatch('POST', '/api/communications', ['caseId' => $createdCase['id'], 'type' => 'Email', 'subject' => 'Allowed', 'body' => 'Allowed']);
    verify(isset($communication['id']), "$role retains communications and notes.");
    $router->dispatch('PATCH', '/api/settings', ['profile' => ['name' => $originalUser['name'], 'email' => $originalUser['email']], 'display' => ['density' => 'compact', 'timezone' => 'UTC']]);
    verify($users->find($user['id'])['settings']['display']['timezone'] === 'UTC', "$role retains settings.");
    // Missing files reach existing upload validation, rather than authorization denial.
    unavailable(fn() => $router->dispatch('POST', '/api/avatar', []), 422);
    unavailable(fn() => $router->dispatch('POST', '/api/cases/' . $createdCase['id'] . '/attachments', []), 422);
    ob_start();
    $router->dispatch('GET', '/api/attachments/FILE-permission-test', []);
    verify(ob_get_clean() === 'test', "$role retains attachment download.");
    if ($role === 'Admin') verify(count($router->dispatch('GET', '/api/users', [])) === 2, 'Admin retains user management.');
    else unavailable(fn() => $router->dispatch('GET', '/api/users', []), 403);
}
$users->save(array_merge($originalUser, ['role' => 'Unknown']));
unavailable(fn() => $router->dispatch('GET', '/api/workspace', []), 403);
unavailable(fn() => $router->dispatch('POST', '/api/customers', []), 403);
$users->save($originalUser);
$_SESSION = [];
unset($_SERVER['HTTP_X_CSRF_TOKEN']);
