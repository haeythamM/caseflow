<?php
declare(strict_types=1);

spl_autoload_register(function (string $class): void {
    $prefix = 'CaseFlow\\';
    if (strpos($class, $prefix) === 0) {
        $file = __DIR__ . '/src/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) require $file;
    }
});
date_default_timezone_set('UTC');

return new CaseFlow\Container(require __DIR__ . '/config/data-access.php');
