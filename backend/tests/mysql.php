<?php
declare(strict_types=1);

use CaseFlow\DataAccess\Contracts\CustomerRepository;
use CaseFlow\DataAccess\Contracts\UserRepository;
use CaseFlow\DataAccess\Contracts\UnitOfWork;
use CaseFlow\Http\HttpError;
use CaseFlow\Services\AuthService;

$container = require __DIR__ . '/../bootstrap.php';
$pdo = $container->get(PDO::class);
$checks = 0;
function verify(bool $condition, string $message): void {
    global $checks;
    if (!$condition) throw new RuntimeException($message);
    $checks++;
}
function unavailable(callable $operation, int $status): void {
    try { $operation(); } catch (HttpError $error) {
        verify($error->status === $status, 'Unexpected HTTP status: ' . $error->status);
        return;
    }
    throw new RuntimeException('Expected HTTP ' . $status);
}

// Connection-local copies of the ACTUAL schema shadow the real tables for this
// process only. No persistent records, sequences, or schema are changed.
foreach (['users', 'customers', 'cases', 'case_activities', 'communications', 'attachments', 'login_attempts'] as $table) {
    $definition = $pdo->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_NUM)[1];
    if (strpos($definition, 'CREATE TABLE ') !== 0) throw new RuntimeException('Unexpected table definition.');
    // MariaDB temporary tables cannot carry foreign keys. Preserve columns and
    // indexes; foreign-key enforcement needs a separate disposable database.
    $definition = preg_replace('/^\s*CONSTRAINT .*FOREIGN KEY.*\R?/m', '', $definition);
    $definition = preg_replace('/,\s*\)/', "\n)", $definition);
    $pdo->exec('CREATE TEMPORARY TABLE ' . substr($definition, strlen('CREATE TABLE ')));
}
try {
    $users = $container->get(UserRepository::class);
    $customers = $container->get(CustomerRepository::class);
    $work = $container->get(UnitOfWork::class);
    verify($container->get(PDO::class) === $pdo, 'PDO must be shared.');
    verify($container->get(CustomerRepository::class) === $customers, 'Repository must be shared.');

    $hash = password_hash('Temporary-test-password!', PASSWORD_DEFAULT);
    $insert = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
    $insert->execute(['Repository Test', 'repository@example.test', $hash]);
    $id = $pdo->lastInsertId();
    $user = $users->find($id);
    verify($user['id'] === $id && $user['sessionVersion'] === 1, 'User ID/version mapping failed.');
    verify($user['password'] === $hash && password_verify('Temporary-test-password!', $user['password']), 'Password mapping failed.');
    verify($user['settings'] === [] && $user['avatarId'] === null, 'Absent optional fields failed.');
    verify($users->findByEmail('REPOSITORY@EXAMPLE.TEST')['id'] === $id, 'Email lookup must be case insensitive.');
    verify($users->emailExists('REPOSITORY@EXAMPLE.TEST') && !$users->emailExists('repository@example.test', $id), 'User email exclusion failed.');
    verify($users->find($id . 'abc') === null && $users->find('') === null, 'Malformed ID must not match numeric ID.');
    verify($users->agentExists('Repository Test') && in_array('Repository Test', $users->agentNames(), true), 'Agent lookup failed.');
    $user['name'] = 'Updated Test';
    $user['sessionVersion'] = 2;
    $users->save($user);
    verify($users->find($id)['name'] === 'Updated Test' && $users->find($id)['sessionVersion'] === 2, 'User update failed.');
    $users->save($user); // Saving an unchanged row must succeed.
    $insert->execute(['Second User', 'second@example.test', $hash]);
    unavailable(fn() => $users->save(array_merge($user, ['email' => 'SECOND@EXAMPLE.TEST'])), 422);
    verify($users->find($id)['email'] === 'repository@example.test', 'Duplicate email must not overwrite another user.');
    unavailable(fn() => $users->save(array_merge($user, ['id' => '9999999999999999999'])), 404);
    $preferences = ['display' => ['density' => 'compact']];
    $users->save(array_merge($user, ['settings' => $preferences]));
    verify($users->find($id)['settings'] === $preferences, 'Settings must persist.');
    $users->save(array_merge($user, ['avatarId' => 'FILE-test']));
    verify($users->find($id)['avatarId'] === 'FILE-test', 'Avatar reference must persist.');
    $userService = $container->get(\CaseFlow\Services\UserService::class);
    unavailable(fn() => $userService->all(['role' => 'Support Agent']), 403);
    $publicUsers = $userService->all(['role' => 'Admin']);
    verify(count($publicUsers) === 2, 'Admin can list users.');
    verify(!isset($publicUsers[0]['password']) && !isset($publicUsers[0]['password_hash']), 'User listing excludes passwords.');
    verify(!isset(AuthService::publicUser($user)['password']), 'Password must not appear in public user.');

    $customer = ['id' => 'CUST-REPOSITORY-TEST', 'firstName' => 'Test', 'lastName' => 'Customer', 'email' => 'customer@example.test', 'phone' => '123', 'status' => 'Active', 'postalCode' => 'A1A 1A1', 'notes' => "O'Brien العربية", 'createdDate' => '2026-01-02 03:04:05'];
    $customers->save($customer);
    $stored = $customers->find($customer['id']);
    verify($stored['firstName'] === 'Test' && $stored['postalCode'] === 'A1A 1A1', 'Customer column aliases failed.');
    verify($stored['address'] === null && $stored['notes'] === $customer['notes'], 'Null/Unicode preservation failed.');
    verify($stored['createdDate'] === $customer['createdDate'], 'Created date mapping failed.');
    verify($customers->emailExists('CUSTOMER@EXAMPLE.TEST') && !$customers->emailExists($customer['email'], $customer['id']), 'Customer email exclusion failed.');
    $customer['firstName'] = 'Updated';
    $customers->save($customer);
    verify($customers->find($customer['id'])['firstName'] === 'Updated', 'Customer update failed.');
    unavailable(fn() => $customers->save(array_merge($customer, ['id' => 'CUST-DUPLICATE'])), 422);
    verify($customers->find('CUST-DUPLICATE') === null, 'Duplicate email inserted a record.');
    verify($customers->all()[0]['casesCount'] === 0, 'New customer has no cases.');
    $caseService = $container->get(\CaseFlow\Services\CaseService::class);
    $case = $caseService->save(['customerId' => $customer['id'], 'subject' => 'Test case', 'description' => 'Integration test', 'priority' => 'High', 'status' => 'Open', 'assignedAgent' => $user['name']], $user);
    verify($customers->all()[0]['casesCount'] === 1, 'Case count reflects saved case.');
    unavailable(fn() => $customers->deleteWithoutCases($customer['id']), 409);
    $caseService->update($case['id'], ['text' => 'Resolved in test', 'status' => 'Resolved'], $user);
    verify($caseService->find($case['id'])['resolvedAt'] !== null, 'Resolved timestamp is recorded.');
    $caseService->update($case['id'], ['text' => 'Reopened in test', 'status' => 'Open'], $user);
    verify($caseService->find($case['id'])['resolvedAt'] === null, 'Reopening clears resolved timestamp.');
    $attempts = $container->get(\CaseFlow\DataAccess\Contracts\LoginAttemptRepository::class);
    $attempts->recordFailure('integration-test', time() + 900);
    $attempts->recordFailure('integration-test', time() + 900);
    verify($attempts->countSince('integration-test', time()) === 2, 'Login failures accumulate.');
    $attempts->clear('integration-test');
    verify($attempts->countSince('integration-test', time()) === 0, 'Login failures clear.');

    $auth = $container->get(AuthService::class);
    $authUser = $users->find($id);
    $_SESSION = ['userId' => $id, 'expires' => time() + 60, 'version' => $authUser['sessionVersion']];
    verify($auth->currentUser()['id'] === $id, 'Valid session resolves the current database user.');
    $_SESSION['expires'] = time() - 1;
    unavailable(fn() => $auth->currentUser(), 401);
    $_SESSION = ['userId' => $id, 'expires' => time() + 60, 'version' => $authUser['sessionVersion'] + 1];
    unavailable(fn() => $auth->currentUser(), 401);
    $_SESSION = [];
    for ($attempt = 0; $attempt < 5; $attempt++) {
        unavailable(fn() => $auth->login(['email' => $authUser['email'], 'password' => 'deliberately-invalid']), 401);
    }
    unavailable(fn() => $auth->login(['email' => $authUser['email'], 'password' => 'deliberately-invalid']), 429);

    $failure = new RuntimeException('Rollback test');
    try {
        $work->run(function () use ($users, $user, $customers, $customer, $failure): void {
            $user['name'] = 'Should roll back';
            $users->save($user);
            $customer['firstName'] = 'Should roll back';
            $customers->save($customer);
            throw $failure;
        });
    } catch (RuntimeException $error) { if ($error !== $failure) throw $error; }
    verify($users->find($id)['name'] === 'Updated Test' && $customers->find($customer['id'])['firstName'] === 'Updated', 'Shared transaction rollback failed.');
    verify(!$pdo->inTransaction(), 'Transaction left open.');
    require __DIR__ . '/demo-viewer-checks.php';
    require __DIR__ . '/avatar-integration-checks.php';
    require __DIR__ . '/case-contract-checks.php';
    if (in_array('--contracts', $argv, true)) {
        $workspace = $container->get(\CaseFlow\Services\WorkspaceService::class)->read($user);
        $failures = [];
        if (($workspace['cases'][0]['customerName'] ?? null) !== 'Updated Customer') {
            $failures[] = 'Workspace cases omit customerName required by Cases, Dashboard and Navbar.';
        }
        $attachments = $container->get(\CaseFlow\DataAccess\Contracts\AttachmentRepository::class);
        $attachments->add(['id' => 'FILE-avatar-test', 'caseId' => null, 'userId' => $id, 'name' => 'avatar.png', 'mime' => 'image/png', 'size' => 4, 'content' => 'test', 'date' => '2026-01-02 03:04:05']);
        $attachmentService = $container->get(\CaseFlow\Services\AttachmentService::class);
        verify($attachmentService->download('FILE-avatar-test', $user)['id'] === 'FILE-avatar-test', 'Avatar owner can download.');
        unavailable(fn() => $attachmentService->download('FILE-avatar-test', ['id' => 'other-admin', 'role' => 'Admin']), 404);
        $users->save(array_merge($user, ['avatarId' => 'FILE-avatar-test']));
        verify($userService->avatar($id, ['id' => 'other-admin', 'role' => 'Admin'])['content'] === 'test', 'Admin reads avatar through dedicated user service.');
        if ($failures) throw new RuntimeException("Frontend/backend contract failures:\n" . implode("\n", $failures));
    }
    echo "Passed $checks MySQL integration checks using temporary copies of the existing schema (including role authorization" . (in_array('--contracts', $argv, true) ? ' and API contracts' : '') . ").\n";
} finally {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $pdo->exec('DROP TEMPORARY TABLE IF EXISTS login_attempts, attachments, communications, case_activities, cases, customers, users');
}
