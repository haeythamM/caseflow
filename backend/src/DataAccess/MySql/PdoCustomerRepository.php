<?php
declare(strict_types=1);

namespace CaseFlow\DataAccess\MySql;

use CaseFlow\DataAccess\Contracts\CaseRepository;
use CaseFlow\DataAccess\Contracts\CustomerRepository;
use CaseFlow\DataAccess\Contracts\UnitOfWork;
use CaseFlow\Http\HttpError;
use Closure;
use PDO;
use PDOException;

final class PdoCustomerRepository implements CustomerRepository
{
    private PDO $pdo;
    private UnitOfWork $transactions;
    private Closure $resolveCases;
    private const COLUMNS = 'id, first_name AS firstName, last_name AS lastName, email, phone, address, city, province, postal_code AS postalCode, country, notes, status, created_at AS createdDate';

    /** Case access is deferred so existing customer records work before cases are configured. */
    public function __construct(PDO $pdo, UnitOfWork $transactions, Closure $resolveCases)
    {
        $this->pdo = $pdo;
        $this->transactions = $transactions;
        $this->resolveCases = $resolveCases;
    }

    private function cases(): CaseRepository { return ($this->resolveCases)(); }

    public function find(string $id): ?array
    {
        $statement = $this->pdo->prepare('SELECT ' . self::COLUMNS . ' FROM customers WHERE id = ?');
        $statement->execute([$id]);
        $customer = $statement->fetch();
        return $customer === false ? null : $customer;
    }

    public function all(): array
    {
        // Do not present invented zero counts while the case repository is absent.
        $counts = [];
        foreach ($this->cases()->all() as $case) {
            $counts[$case['customerId']] = ($counts[$case['customerId']] ?? 0) + 1;
        }
        $customers = $this->pdo->query('SELECT ' . self::COLUMNS . ' FROM customers ORDER BY created_at DESC, id DESC')->fetchAll();
        foreach ($customers as &$customer) $customer['casesCount'] = $counts[$customer['id']] ?? 0;
        unset($customer);
        return $customers;
    }

    public function emailExists(string $email, ?string $exceptId = null): bool
    {
        $statement = $this->pdo->prepare('SELECT 1 FROM customers WHERE email = ?' . ($exceptId !== null ? ' AND id <> ?' : '') . ' LIMIT 1');
        $statement->execute($exceptId !== null ? [$email, $exceptId] : [$email]);
        return $statement->fetchColumn() !== false;
    }

    public function save(array $customer): void
    {
        try {
            $this->transactions->run(function () use ($customer): void {
                $lock = $this->pdo->prepare('SELECT id FROM customers WHERE id = ? FOR UPDATE');
                $lock->execute([$customer['id']]);
                $exists = $lock->fetchColumn() !== false;
                $values = [$customer['firstName'], $customer['lastName'], $customer['email'], $customer['phone'], $customer['address'] ?? null, $customer['city'] ?? null, $customer['province'] ?? null, $customer['postalCode'] ?? null, $customer['country'] ?? null, $customer['notes'] ?? null, $customer['status']];
                if ($exists) {
                    $statement = $this->pdo->prepare('UPDATE customers SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?, city = ?, province = ?, postal_code = ?, country = ?, notes = ?, status = ? WHERE id = ?');
                    $values[] = $customer['id'];
                } else {
                    $statement = $this->pdo->prepare('INSERT INTO customers (first_name, last_name, email, phone, address, city, province, postal_code, country, notes, status, id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                    $values[] = $customer['id'];
                    $values[] = $customer['createdDate'];
                }
                $statement->execute($values);
            });
        } catch (PDOException $error) {
            if ((int) ($error->errorInfo[1] ?? 0) === 1062) throw new HttpError(422, 'Email already in use.', ['email' => 'Email already in use.']);
            throw $error;
        }
    }

    public function deleteWithoutCases(string $id): void
    {
        // Refuse deletion until case history can actually be checked.
        $cases = $this->cases();
        $this->transactions->run(function () use ($id, $cases): void {
            $lock = $this->pdo->prepare('SELECT id FROM customers WHERE id = ? FOR UPDATE');
            $lock->execute([$id]);
            if ($lock->fetchColumn() === false) throw new HttpError(404, 'Customer not found.');
            if ($cases->hasCustomerCases($id)) throw new HttpError(409, 'Customer has case history and cannot be deleted.');
            $statement = $this->pdo->prepare('DELETE FROM customers WHERE id = ?');
            $statement->execute([$id]);
        });
    }
}
