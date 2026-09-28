<?php
declare(strict_types=1);

// CLI only; deliberately independent of application bootstrap and local defaults.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

/** Compare server-normalized DDL, ignoring only names and sequence state. */
function schemaDefinition(string $ddl): string
{
    $ddl = preg_replace('/^CREATE (?:TEMPORARY )?TABLE `[^`]+`/', 'CREATE TABLE `table`', $ddl);
    $ddl = preg_replace('/^\s*CONSTRAINT .*FOREIGN KEY.*\R?/m', '', $ddl);
    $ddl = preg_replace('/,\s*\)/', "\n)", $ddl);
    $ddl = preg_replace('/ AUTO_INCREMENT=\d+/', '', $ddl);
    return trim(preg_replace('/\s+/', ' ', $ddl));
}

function schemaForeignKeys(string $ddl): array
{
    preg_match_all('/CONSTRAINT `[^`]+` FOREIGN KEY [^\r\n]+/', $ddl, $matches);
    $keys = array_map(static function (string $key): string {
        $key = rtrim($key, ',');
        // Omitted actions and explicit RESTRICT/NO ACTION have the same meaning.
        return preg_replace('/ ON (?:DELETE|UPDATE) (?:RESTRICT|NO ACTION)/', '', $key);
    }, $matches[0]);
    sort($keys);
    return $keys;
}

/** Preflight every existing table before issuing any persistent DDL. */
function initializeSchema(PDO $pdo, string $path): void
{
    $sql = file_get_contents($path);
    if ($sql === false) throw new RuntimeException('Cannot read database/schema.sql.');
    // This file intentionally supports only simple CREATE TABLE statements, not migrations.
    $sql = preg_replace('/^--[^\r\n]*/m', '', $sql);
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    $tables = [];
    foreach ($statements as $statement) {
        if (!preg_match('/\ACREATE TABLE IF NOT EXISTS `([a-z_]+)` \(/', $statement, $match)) {
            throw new RuntimeException('Schema must contain only CREATE TABLE IF NOT EXISTS statements.');
        }
        $tables[$match[1]] = $statement;
    }
    if (count($tables) !== 7) throw new RuntimeException('Expected seven schema tables.');

    foreach ($tables as $table => $statement) {
        $probe = 'caseflow_schema_' . bin2hex(random_bytes(8));
        $definition = preg_replace('/^\s*CONSTRAINT .*FOREIGN KEY.*\R?/m', '', $statement);
        $definition = preg_replace('/,\s*\)/', "\n)", $definition);
        $definition = str_replace("CREATE TABLE IF NOT EXISTS `$table`", "CREATE TEMPORARY TABLE `$probe`", $definition);
        try {
            $pdo->exec($definition);
            $expected = $pdo->query("SHOW CREATE TABLE `$probe`")->fetch(PDO::FETCH_NUM)[1];
            $exists = $pdo->prepare('SELECT TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
            $exists->execute([$table]);
            $type = $exists->fetchColumn();
            if ($type !== false) {
                if ($type !== 'BASE TABLE') throw new RuntimeException("Schema mismatch for $table: expected a base table.");
                $actual = $pdo->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_NUM)[1];
                if (schemaDefinition($actual) !== schemaDefinition($expected)
                    || schemaForeignKeys($actual) !== schemaForeignKeys($statement)) {
                    throw new RuntimeException("Schema mismatch for $table. No tables created; review SHOW CREATE TABLE against database/schema.sql and plan a separate migration.");
                }
            }
        } catch (PDOException $error) {
            throw new RuntimeException("SQL preflight failed for $table (SQLSTATE " . ($error->errorInfo[0] ?? $error->getCode()) . ', driver ' . ($error->errorInfo[1] ?? 'unknown') . ').', 0, $error);
        } finally {
            $pdo->exec("DROP TEMPORARY TABLE IF EXISTS `$probe`");
        }
    }

    foreach ($tables as $table => $statement) {
        try {
            $pdo->exec($statement);
        } catch (PDOException $error) {
            throw new RuntimeException("CREATE TABLE failed for $table (SQLSTATE " . ($error->errorInfo[0] ?? $error->getCode()) . ', driver ' . ($error->errorInfo[1] ?? 'unknown') . '). Earlier CREATE statements may have committed; resolve the cause and rerun.', 0, $error);
        }
    }
}

function setupDatabase(): int
{
    $phase = 'configuration';
    try {
        $env = [];
        foreach (['MYSQLHOST', 'MYSQLPORT', 'MYSQLDATABASE', 'MYSQLUSER', 'MYSQLPASSWORD'] as $name) {
            $value = getenv($name);
            if ($value === false || ($value === '' && $name !== 'MYSQLPASSWORD')) {
                throw new RuntimeException("Required environment variable $name is missing.");
            }
            $env[$name] = $value;
        }
        foreach (['MYSQLHOST', 'MYSQLDATABASE'] as $name) {
            if (preg_match('/[;\x00-\x20]/', $env[$name])) throw new RuntimeException("Invalid $name.");
        }
        if (!ctype_digit($env['MYSQLPORT']) || (int) $env['MYSQLPORT'] < 1 || (int) $env['MYSQLPORT'] > 65535) {
            throw new RuntimeException('MYSQLPORT must be an integer between 1 and 65535.');
        }
        if (!in_array('mysql', PDO::getAvailableDrivers(), true)) throw new RuntimeException('PHP pdo_mysql extension is required.');
        $phase = 'connection';
        $pdo = new PDO(sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $env['MYSQLHOST'], $env['MYSQLPORT'], $env['MYSQLDATABASE']), $env['MYSQLUSER'], $env['MYSQLPASSWORD'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 10,
            PDO::MYSQL_ATTR_MULTI_STATEMENTS => false,
        ]);
        $phase = 'schema initialization';
        initializeSchema($pdo, __DIR__ . '/../database/schema.sql');
        fwrite(STDOUT, "Database schema initialized: seven tables verified. No users or application data inserted.\n");
        return 0;
    } catch (Throwable $error) {
        // Driver messages can contain connection details; never print them or a stack trace.
        $detail = $error instanceof PDOException
            ? 'SQLSTATE ' . ($error->errorInfo[0] ?? $error->getCode()) . ', driver ' . ($error->errorInfo[1] ?? 'unknown')
            : ($error instanceof RuntimeException ? $error->getMessage() : 'Unexpected initialization error.');
        fwrite(STDERR, "Database setup failed during $phase: $detail\n");
        return 1;
    }
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    exit(setupDatabase());
}
