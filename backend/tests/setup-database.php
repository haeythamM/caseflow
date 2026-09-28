<?php
declare(strict_types=1);

require __DIR__ . '/../scripts/setup-database.php';

// Explicit opt-in: creates and removes only a new randomly named test database.
if (getenv('CASEFLOW_SETUP_TESTS') !== '1') {
    fwrite(STDERR, "Set CASEFLOW_SETUP_TESTS=1 to allow an isolated database initialization test.\n");
    exit(1);
}
$pdo = require __DIR__ . '/../config/connection.php';
$database = 'caseflow_setup_test_' . bin2hex(random_bytes(8));
$schema = __DIR__ . '/../database/schema.sql';
$checks = 0;
function setupCheck(bool $condition, string $message): void
{
    global $checks;
    if (!$condition) throw new RuntimeException($message);
    $checks++;
}
function constraintRejects(PDO $pdo, string $sql): void
{
    try {
        $pdo->exec($sql);
    } catch (PDOException $error) {
        setupCheck(in_array((int) ($error->errorInfo[1] ?? 0), [1062, 1452], true), 'Unexpected constraint error.');
        return;
    }
    throw new RuntimeException('Expected a constraint violation.');
}

$pdo->exec("CREATE DATABASE `$database` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
try {
    $pdo->exec("USE `$database`");
    initializeSchema($pdo, $schema);
    setupCheck(count($pdo->query('SHOW TABLES')->fetchAll()) === 7, 'Expected seven tables.');
    foreach (['users', 'customers', 'login_attempts', 'cases', 'case_activities', 'communications', 'attachments'] as $table) {
        setupCheck((int) $pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn() === 0, 'Initialization must not seed data.');
    }
    initializeSchema($pdo, $schema);
    setupCheck(true, 'Empty-schema rerun succeeds.');
    $pdo->exec("INSERT INTO users (name,email,password_hash) VALUES ('Test','setup@example.test','not-a-login-hash')");
    $pdo->exec("INSERT INTO customers (id,first_name,last_name,email,phone) VALUES ('CUST-test','Test','Customer','customer@example.test','123')");
    $pdo->exec("INSERT INTO cases (id,customer_id,subject,description,created_at,updated_at) VALUES ('CASE-test','CUST-test','Test','Test',NOW(),NOW())");
    $pdo->exec("INSERT INTO attachments (id,case_id,user_id,file_name,mime_type,file_size,file_content,created_at) VALUES ('FILE-test',NULL,1,'test.png','image/png',4,'test',NOW())");
    initializeSchema($pdo, $schema);
    setupCheck((int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() === 1, 'Populated rerun preserves data.');
    constraintRejects($pdo, "INSERT INTO users (name,email,password_hash) VALUES ('Test','SETUP@example.test','unused')");
    constraintRejects($pdo, "INSERT INTO customers (id,first_name,last_name,email,phone) VALUES ('duplicate','Test','Customer','CUSTOMER@example.test','123')");
    constraintRejects($pdo, "INSERT INTO cases (id,customer_id,subject,description,created_at,updated_at) VALUES ('bad','missing','Test','Test',NOW(),NOW())");
    constraintRejects($pdo, "INSERT INTO case_activities VALUES ('bad','missing','note','Test','Test',NOW())");
    constraintRejects($pdo, "INSERT INTO communications VALUES ('bad','missing','CUST-test','Email','Test','Test','Test',NOW())");
    constraintRejects($pdo, "INSERT INTO communications VALUES ('bad','CASE-test','missing','Email','Test','Test','Test',NOW())");
    constraintRejects($pdo, "INSERT INTO attachments VALUES ('bad','missing',1,'test','text/plain',4,'test',NOW())");
    constraintRejects($pdo, "INSERT INTO attachments VALUES ('bad',NULL,999,'test','text/plain',4,'test',NOW())");

    // Only this test's disposable tables are changed to simulate schema drift.
    foreach (['ALTER TABLE users MODIFY name varchar(151) NOT NULL', 'ALTER TABLE users DROP INDEX email', 'ALTER TABLE cases DROP FOREIGN KEY fk_cases_customer'] as $alter) {
        $pdo->exec($alter);
        try {
            initializeSchema($pdo, $schema);
            throw new LogicException('Incompatible schema was accepted.');
        } catch (RuntimeException $error) {
            setupCheck(strpos($error->getMessage(), 'Schema mismatch') !== false, 'Expected explicit drift failure.');
        }
        // Restore the deliberate test change before testing the next mismatch.
        if (strpos($alter, 'MODIFY') !== false) $pdo->exec('ALTER TABLE users MODIFY name varchar(150) NOT NULL');
        elseif (strpos($alter, 'DROP INDEX') !== false) $pdo->exec('ALTER TABLE users ADD UNIQUE KEY email (email)');
        else $pdo->exec('ALTER TABLE cases ADD CONSTRAINT fk_cases_customer FOREIGN KEY (customer_id) REFERENCES customers (id)');
    }
    $invalidSchema = tempnam(sys_get_temp_dir(), 'caseflow_schema_');
    try {
        file_put_contents($invalidSchema, str_replace('`name` varchar(150)', '`name` invalid_type', file_get_contents($schema)));
        try {
            initializeSchema($pdo, $invalidSchema);
            throw new LogicException('Invalid SQL was accepted.');
        } catch (RuntimeException $error) {
            setupCheck(strpos($error->getMessage(), 'SQL preflight failed for users (SQLSTATE') === 0, 'SQL errors must identify phase, table and SQLSTATE.');
        }
    } finally {
        unlink($invalidSchema);
    }
    echo "Passed $checks database initialization checks in an isolated database.\n";
} finally {
    // Never use a configured database name for cleanup.
    $pdo->exec("DROP DATABASE `$database`");
}
