<?php

declare(strict_types=1);

// Resolve lazily: health and CSRF endpoints do not need a database connection.
// The container caches PDO so all repositories share the transaction connection.

return [

    PDO::class => static fn() =>
        require __DIR__ . '/connection.php',

    \CaseFlow\DataAccess\Contracts\UnitOfWork::class =>
        static fn(\CaseFlow\Container $container) =>
            new \CaseFlow\DataAccess\MySql\PdoUnitOfWork(
                $container->get(PDO::class)
            ),

    \CaseFlow\DataAccess\Contracts\UserRepository::class =>
        static fn(\CaseFlow\Container $container) =>
            new \CaseFlow\DataAccess\MySql\PdoUserRepository(
                $container->get(PDO::class),
                $container->get(\CaseFlow\DataAccess\Contracts\UnitOfWork::class)
            ),

    \CaseFlow\DataAccess\Contracts\LoginAttemptRepository::class =>
        static fn(\CaseFlow\Container $container) =>
            new \CaseFlow\DataAccess\MySql\PdoLoginAttemptRepository(
                $container->get(PDO::class)
            ),

    \CaseFlow\DataAccess\Contracts\CaseRepository::class =>
        static fn(\CaseFlow\Container $container) =>
            new \CaseFlow\DataAccess\MySql\PdoCaseRepository(
                $container->get(PDO::class),
                $container->get(\CaseFlow\DataAccess\Contracts\UnitOfWork::class)
            ),

    \CaseFlow\DataAccess\Contracts\ActivityRepository::class =>
        static fn(\CaseFlow\Container $container) =>
            new \CaseFlow\DataAccess\MySql\PdoActivityRepository(
                $container->get(PDO::class)
            ),

    \CaseFlow\DataAccess\Contracts\CommunicationRepository::class =>
        static fn(\CaseFlow\Container $container) =>
            new \CaseFlow\DataAccess\MySql\PdoCommunicationRepository(
                $container->get(PDO::class)
            ),
\CaseFlow\DataAccess\Contracts\AttachmentRepository::class =>
    static fn(\CaseFlow\Container $container) =>
        new \CaseFlow\DataAccess\MySql\PdoAttachmentRepository(
            $container->get(PDO::class)
        ),
    \CaseFlow\DataAccess\Contracts\CustomerRepository::class =>
        static fn(\CaseFlow\Container $container) =>
            new \CaseFlow\DataAccess\MySql\PdoCustomerRepository(
                $container->get(PDO::class),
                $container->get(\CaseFlow\DataAccess\Contracts\UnitOfWork::class),
                static fn() =>
                    $container->get(
                        \CaseFlow\DataAccess\Contracts\CaseRepository::class
                    )
            ),

];