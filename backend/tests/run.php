<?php
declare(strict_types=1);

use CaseFlow\Container;
use CaseFlow\DataAccess\Contracts\CustomerRepository;
use CaseFlow\Http\HttpError;
use CaseFlow\Http\Router;
use CaseFlow\Services\AuthService;
use CaseFlow\Services\CustomerService;
use CaseFlow\Validation\Validator;

$container = require __DIR__ . '/../bootstrap.php';
// Exercise the unbound-contract boundary without opening the configured database.
$container = new Container();
$count = 0;
function check(bool $value, string $label): void
{
    global $count;
    if (!$value) throw new RuntimeException('FAIL: ' . $label);
    $count++;
}
function rejects(callable $operation, int $status): void
{
    try { $operation(); }
    catch (HttpError $error) { check($error->status === $status, 'HTTP ' . $status); return; }
    throw new RuntimeException('Expected HTTP ' . $status);
}

$router = new Router($container, require __DIR__ . '/../routes/api.php');
$_SESSION = ['csrf' => 'test-token'];
check($router->dispatch('GET', '/api/health', [])['status'] === 'ok', 'Health without data access');
check($router->dispatch('GET', '/api/auth/csrf', [])['csrf'] === 'test-token', 'CSRF without data access');
rejects(fn() => $router->dispatch('GET', '/api/workspace', []), 401);
rejects(fn() => $router->dispatch('POST', '/api/auth/login', []), 419);
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'test-token';
rejects(fn() => $router->dispatch('POST', '/api/auth/login', ['email' => 'a@example.test', 'password' => 'not-used']), 503);
rejects(fn() => $router->dispatch('POST', '/api/health', []), 405);
rejects(fn() => $router->dispatch('GET', '/api/missing', []), 404);
rejects(fn() => $container->get(CustomerRepository::class), 503);
$_SESSION += ['userId' => 'legacy-session', 'expires' => time() + 3600];
rejects(fn() => $router->dispatch('GET', '/api/workspace', []), 503);
unset($_SESSION['userId'], $_SESSION['expires']);

// Test-only spy: no database, runtime registration, or substitute persistence.
$spy = new class implements CustomerRepository {
    public ?array $saved = null;
    public function find(string $id): ?array { return null; }
    public function all(): array { return []; }
    public function emailExists(string $email, ?string $exceptId = null): bool { return $email === 'duplicate@example.test'; }
    public function save(array $customer): void { $this->saved = $customer; }
    public function deleteWithoutCases(string $id): void { throw new LogicException('Unexpected call'); }
};
$service = new CustomerService($spy);
$input = ['firstName' => 'Sara', 'lastName' => 'Ali', 'email' => 'sara@example.test', 'phone' => '123', 'status' => 'Active'];
$customer = $service->save($input);
check($spy->saved === $customer, 'Service delegates persistence through a contract');
check(strpos($customer['id'], 'CUST-') === 0, 'Generated application ID');
rejects(fn() => $service->save(array_merge($input, ['status' => 'invalid'])), 422);
rejects(fn() => $service->save(array_merge($input, ['email' => 'duplicate@example.test'])), 422);
rejects(fn() => $service->save($input, 'missing'), 404);
rejects(fn() => $service->delete('missing'), 404);
rejects(fn() => Validator::password('short'), 422);
foreach (['firstName' => 100, 'lastName' => 100, 'name' => 150, 'phone' => 50, 'city' => 100, 'province' => 100, 'country' => 100, 'postalCode' => 30, 'customerId' => 32, 'caseId' => 32, 'assignedAgent' => 150] as $field => $limit) {
    check(Validator::fields([$field => str_repeat('x', $limit)], [$field])[$field] === str_repeat('x', $limit), 'Accept field at schema limit: ' . $field);
    rejects(fn() => Validator::fields([$field => str_repeat('x', $limit + 1)], [$field]), 422);
}
rejects(fn() => $service->save(array_merge($input, ['firstName' => str_repeat('x', 101)])), 422);
rejects(fn() => Validator::fields(['email' => ['invalid']], ['email']), 422);
$public = AuthService::publicUser(['id' => 'u', 'name' => 'User', 'email' => 'u@example.test', 'role' => 'Support Agent', 'password' => 'secret', 'sessionVersion' => 5, 'settings' => []]);
check(!isset($public['password']) && !isset($public['sessionVersion']), 'Public user excludes secrets');
check(is_object($public['settings']), 'Settings preserve frontend JSON shape');
$invalid = new Container([CustomerRepository::class => new stdClass()]);
try { $invalid->get(CustomerRepository::class); throw new RuntimeException('Expected invalid binding failure'); }
catch (LogicException $error) { check(true, 'Bindings must implement their interface'); }

// Persistence is allowed only in DataAccess and connection configuration.
foreach (['src/Services', 'src/Controllers', 'src/Authentication', 'src/Middleware', 'routes', 'public'] as $folder) {
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator(__DIR__ . '/../' . $folder)) as $file) {
        if ($file->getExtension() !== 'php') continue;
        check(!preg_match('/\bPDO\b|sqlite:|\bmysqli\b|\bSELECT\s+.+\bFROM\b|\bCREATE\s+TABLE\b|\bINSERT\s+INTO\b/i', file_get_contents($file->getPathname())), 'No SQL or concrete driver in ' . $file->getFilename());
    }
}
$demoPolicy = new \CaseFlow\Middleware\AuthorizeDemoViewer();
foreach (['', 'Viewer', 'admin', 'Unknown'] as $invalidRole) {
    rejects(fn() => $demoPolicy->handle('GET', '/api/workspace', ['role' => $invalidRole]), 403);
    rejects(fn() => $demoPolicy->handle('POST', '/api/customers', ['role' => $invalidRole]), 403);
}
foreach (['GET', 'HEAD'] as $method) {
    foreach (['/api/workspace', '/api/auth/me', '/api/customers', '/api/cases', '/api/communications', '/api/reports', '/api/cases/CASE-test/activities'] as $path) {
        $demoPolicy->handle($method, $path, ['role' => 'Demo Viewer']);
        check(true, 'Demo Viewer permits read policy: ' . $path);
    }
}
foreach (['POST', 'PUT', 'PATCH', 'DELETE'] as $method) {
    rejects(fn() => $demoPolicy->handle($method, '/api/future-resource', ['role' => 'Demo Viewer']), 403);
    foreach (['Admin', 'Support Agent'] as $role) {
        $demoPolicy->handle($method, '/api/future-resource', ['role' => $role]);
        check(true, 'Existing role policy unchanged: ' . $role);
    }
}
foreach (['/api/users', '/api/users/1/avatar', '/api/settings', '/api/avatar', '/api/attachments/FILE-test', '/api/cases/CASE-test/attachments'] as $path) {
    rejects(fn() => $demoPolicy->handle('GET', $path, ['role' => 'Demo Viewer']), 403);
}

require __DIR__ . '/avatar-service-checks.php';
echo "Passed {$count} architecture and service checks without a database.\n";
