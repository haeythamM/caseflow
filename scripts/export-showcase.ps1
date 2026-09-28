$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = Join-Path $projectRoot 'showcase'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$destination = Join-Path $outputRoot "CaseFlow-$stamp"
New-Item -ItemType Directory -Path $destination -Force | Out-Null

# Allowlist source roots; never traverse runtime data or historical deliveries.
$directories = @('docs', 'scripts', 'frontend/src', 'frontend/tests', 'backend/src', 'backend/config', 'backend/routes', 'backend/public', 'backend/scripts', 'backend/tests', 'backend/database')
$extensions = @('.php', '.tsx', '.ts', '.mjs', '.json', '.css', '.md', '.sql', '.ps1', '.png')
$files = @('README.md', 'LICENSE', '.gitignore', 'frontend/package.json', 'frontend/package-lock.json', 'frontend/index.html', 'frontend/tsconfig.json', 'frontend/vite.config.ts', 'frontend/vitest.config.ts', 'frontend/vercel.json', 'frontend/README.md', 'frontend/LICENSE', 'frontend/.gitignore', 'frontend/.gitattributes', 'backend/bootstrap.php', 'backend/composer.json', 'backend/composer.lock', 'backend/package.json', 'backend/package-lock.json', 'backend/README.md', 'backend/LICENSE', 'backend/.gitignore', 'backend/.env.example', 'backend/public/.htaccess')
foreach ($directory in $directories) {
    Get-ChildItem -LiteralPath (Join-Path $projectRoot $directory) -Recurse -File | Where-Object {
        $_.Extension -in $extensions -and $_.Name -notlike '.env*'
    } | ForEach-Object {
        $files += $_.FullName.Substring($projectRoot.Length + 1)
    }
}
foreach ($relative in ($files | Sort-Object -Unique)) {
    $source = Join-Path $projectRoot $relative
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
    $target = Join-Path $destination $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $target
}
New-Item -ItemType Directory -Path (Join-Path $destination 'backend/storage') -Force | Out-Null
New-Item -ItemType File -Path (Join-Path $destination 'backend/storage/.gitkeep') -Force | Out-Null

# Fail on common credential formats without printing matched values.
$patterns = @('-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', 'gh[pousr]_[A-Za-z0-9]{30,}', 'github_pat_[A-Za-z0-9_]{30,}', 'AKIA[0-9A-Z]{16}', 'sk_live_[A-Za-z0-9]{16,}', '://[^/\s:]+:[^/\s@]+@', '(?i)logicistry')
$findings = @()
Get-ChildItem -LiteralPath $destination -Recurse -File | Where-Object { $_.Name -ne 'export-showcase.ps1' } | ForEach-Object {
    if ($_.Extension -eq '.png') { return }
    $content = [IO.File]::ReadAllText($_.FullName)
    foreach ($pattern in $patterns) {
        if ($content -match $pattern) { $findings += $_.FullName.Substring($destination.Length + 1); break }
    }
}
if ($findings.Count -gt 0) { throw ('Review required in: ' + ($findings -join ', ')) }

# .NET includes dotfiles, unlike Compress-Archive on some Windows versions.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = "$destination.zip"
[IO.Compression.ZipFile]::CreateFromDirectory($destination, $archive)
Write-Output "Source: $destination"
Write-Output "Archive: $archive"
Write-Output "Files: $((Get-ChildItem -LiteralPath $destination -Recurse -File -Force).Count)"
