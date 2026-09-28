<?php

declare(strict_types=1);

namespace CaseFlow\DataAccess\MySql;

use CaseFlow\DataAccess\Contracts\UserRepository;
use CaseFlow\DataAccess\Contracts\UnitOfWork;
use CaseFlow\Http\HttpError;
use PDO;
use PDOException;

final class PdoUserRepository implements UserRepository
{
    private PDO $pdo;
    private UnitOfWork $transactions;

    private const COLUMNS = '
        id,
        name,
        email,
        password_hash AS password,
        role,
        session_version AS sessionVersion,
        avatar_id AS avatarId,
        settings_json AS settingsJson
    ';

    public function __construct(PDO $pdo, UnitOfWork $transactions)
    {
        $this->pdo = $pdo;
        $this->transactions = $transactions;
    }

    private function read(string $where, array $parameters): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT ' . self::COLUMNS . '
             FROM users
             WHERE ' . $where . '
             LIMIT 1'
        );

        $statement->execute($parameters);

        $user = $statement->fetch();

        if ($user === false) {
            return null;
        }

        $user['id'] = (string) $user['id'];
        $user['sessionVersion'] = (int) $user['sessionVersion'];

        $settingsJson = $user['settingsJson'];

        if ($settingsJson === null || $settingsJson === '') {
            $user['settings'] = [];
        } else {
            $decoded = json_decode((string) $settingsJson, true);

            $user['settings'] = is_array($decoded)
                ? $decoded
                : [];
        }

        unset($user['settingsJson']);

        return $user;
    }

    public function find(string $id): ?array
    {
        if (!preg_match('/^[1-9][0-9]{0,19}$/D', $id)) {
            return null;
        }

        return $this->read('id = ?', [$id]);
    }

    public function findByEmail(string $email): ?array
    {
        return $this->read('email = ?', [$email]);
    }

    public function all(): array
    {
        $statement = $this->pdo->query(
            'SELECT
                id,
                name,
                email,
                role,
                avatar_id AS avatarId,
                created_at AS createdAt
             FROM users
             ORDER BY name'
        );

        $users = $statement->fetchAll();

        foreach ($users as $index => $user) {
            $users[$index]['id'] = (string) $user['id'];
        }

        return $users;
    }

    public function emailExists(string $email, ?string $exceptId = null): bool
    {
        $statement = $this->pdo->prepare(
            'SELECT 1
             FROM users
             WHERE email = ?' .
            ($exceptId !== null ? ' AND id <> ?' : '') .
            ' LIMIT 1'
        );

        $statement->execute(
            $exceptId !== null
                ? [$email, $exceptId]
                : [$email]
        );

        return $statement->fetchColumn() !== false;
    }

    public function agentExists(string $name): bool
    {
        $statement = $this->pdo->prepare(
            'SELECT 1
             FROM users
             WHERE name = ?
             LIMIT 1'
        );

        $statement->execute([$name]);

        return $statement->fetchColumn() !== false;
    }

    public function agentNames(): array
    {
        return $this->pdo
            ->query(
                'SELECT DISTINCT name
                 FROM users
                 ORDER BY name'
            )
            ->fetchAll(PDO::FETCH_COLUMN);
    }

    public function save(array $user): void
    {
        if (!preg_match('/^[1-9][0-9]{0,19}$/D', (string) $user['id'])) {
            throw new HttpError(404, 'User not found.');
        }

        $settingsJson = json_encode(
            $user['settings'] ?? [],
            JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES |
            JSON_THROW_ON_ERROR
        );

        try {
            $this->transactions->run(
                function () use ($user, $settingsJson): void {
                    $lock = $this->pdo->prepare(
                        'SELECT id
                         FROM users
                         WHERE id = ?
                         FOR UPDATE'
                    );

                    $lock->execute([$user['id']]);

                    if ($lock->fetchColumn() === false) {
                        throw new HttpError(
                            404,
                            'User not found.'
                        );
                    }

                    $statement = $this->pdo->prepare(
                        'UPDATE users
                         SET
                            name = ?,
                            email = ?,
                            password_hash = ?,
                            role = ?,
                            session_version = ?,
                            avatar_id = ?,
                            settings_json = ?
                         WHERE id = ?'
                    );

                    $statement->execute([
                        $user['name'],
                        $user['email'],
                        $user['password'],
                        $user['role'],
                        $user['sessionVersion'],
                        $user['avatarId'] ?? null,
                        $settingsJson,
                        $user['id'],
                    ]);
                }
            );
        } catch (PDOException $error) {
            if ((int) ($error->errorInfo[1] ?? 0) === 1062) {
                throw new HttpError(
                    422,
                    'Email already in use.',
                    [
                        'email' => 'Email already in use.',
                    ]
                );
            }

            throw $error;
        }
    }
}