<?php
declare(strict_types=1);

use CaseFlow\Authentication\Session;
use CaseFlow\Http\HttpError;
use CaseFlow\Http\Request;
use CaseFlow\Http\Router;

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

try {
    $container = require __DIR__ . '/../bootstrap.php';
    Session::start();
    $router = new Router($container, require __DIR__ . '/../routes/api.php');
    $path = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
    $result = $router->dispatch($_SERVER['REQUEST_METHOD'], $path, Request::input());
    if ($result !== null) echo json_encode(['data' => $result], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (HttpError $error) {
    http_response_code($error->status);
    echo json_encode(['message' => $error->getMessage(), 'errors' => (object) $error->errors]);
} catch (Throwable $error) {
    error_log((string) $error);
    http_response_code(500);
    echo json_encode(['message' => 'An unexpected error occurred. Please try again.']);
}
