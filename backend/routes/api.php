<?php
declare(strict_types=1);

// Method, path pattern, controller, action, authentication required.
return [
    ['GET', '#^/api/health$#', \CaseFlow\Controllers\HealthController::class, 'show', false],
    ['GET', '#^/api/auth/csrf$#', \CaseFlow\Controllers\SessionController::class, 'csrf', false],
    ['POST', '#^/api/auth/logout$#', \CaseFlow\Controllers\SessionController::class, 'logout', false],
    ['POST', '#^/api/auth/login$#', \CaseFlow\Controllers\AuthController::class, 'login', false],
    ['GET', '#^/api/auth/me$#', \CaseFlow\Controllers\AuthController::class, 'me', true],
    ['GET', '#^/api/workspace$#', \CaseFlow\Controllers\WorkspaceController::class, 'show', true],
    ['GET', '#^/api/users$#', \CaseFlow\Controllers\UserController::class, 'index', true],
    ['GET', '#^/api/users/(?P<id>[A-Za-z0-9-]+)/avatar$#', \CaseFlow\Controllers\UserController::class, 'avatar', true],
    ['POST', '#^/api/customers$#', \CaseFlow\Controllers\CustomerController::class, 'create', true],
    ['PATCH', '#^/api/customers/(?P<id>[A-Za-z0-9-]+)$#', \CaseFlow\Controllers\CustomerController::class, 'update', true],
    ['DELETE', '#^/api/customers/(?P<id>[A-Za-z0-9-]+)$#', \CaseFlow\Controllers\CustomerController::class, 'delete', true],
    ['POST', '#^/api/cases$#', \CaseFlow\Controllers\CaseController::class, 'create', true],
    ['PATCH', '#^/api/cases/(?P<id>[A-Za-z0-9-]+)$#', \CaseFlow\Controllers\CaseController::class, 'update', true],
    ['POST', '#^/api/cases/(?P<id>[A-Za-z0-9-]+)/updates$#', \CaseFlow\Controllers\CaseController::class, 'progress', true],
    ['POST', '#^/api/communications$#', \CaseFlow\Controllers\CommunicationController::class, 'create', true],
    ['PATCH', '#^/api/settings$#', \CaseFlow\Controllers\SettingsController::class, 'update', true],
    ['POST', '#^/api/avatar$#', \CaseFlow\Controllers\AttachmentController::class, 'avatar', true],
    ['POST', '#^/api/cases/(?P<id>[A-Za-z0-9-]+)/attachments$#', \CaseFlow\Controllers\AttachmentController::class, 'upload', true],
    ['GET', '#^/api/attachments/(?P<id>[A-Za-z0-9-]+)$#', \CaseFlow\Controllers\AttachmentController::class, 'download', true],
];
