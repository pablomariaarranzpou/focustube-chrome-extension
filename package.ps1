# Builds a clean Chrome Web Store .zip containing ONLY the runtime files.
# Reads .pkgignore (gitignore-style) to decide what to leave out, so you never
# upload the marketing site, tests, node_modules, etc.
#
#   Usage:  powershell -ExecutionPolicy Bypass -File .\package.ps1
#   Output: focustube-<version>.zip  (version read from manifest.json)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# --- version from manifest.json ---
$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$version  = $manifest.version
$zipPath  = Join-Path $root "focustube-$version.zip"
$stage    = Join-Path $env:TEMP ("focustube-pkg-" + [System.Guid]::NewGuid().ToString('N'))

# --- load exclude patterns from .pkgignore ---
$patterns = @()
$ignoreFile = Join-Path $root '.pkgignore'
if (Test-Path $ignoreFile) {
  $patterns = Get-Content $ignoreFile |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -and -not $_.StartsWith('#') }
}

function Test-Excluded([string]$name) {
  foreach ($p in $patterns) { if ($name -like $p) { return $true } }
  return $false
}

# --- stage only the files that should ship ---
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

$included = @()
Get-ChildItem -Path $root -Force | ForEach-Object {
  if (Test-Excluded $_.Name) { return }
  Copy-Item $_.FullName -Destination $stage -Recurse -Force
  $included += $_.Name
}

# --- safety checks: the two easy mistakes ---
if (-not (Test-Path (Join-Path $stage 'tailwind.min.css'))) {
  Write-Warning "tailwind.min.css is MISSING - the popup will look broken. (It is .gitignored; make sure the file exists in the repo root before packaging.)"
}
if (Test-Path (Join-Path $stage 'docs')) {
  throw "docs/ ended up in the package - check .pkgignore."
}

# --- zip it ---
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zipPath -Force
Remove-Item $stage -Recurse -Force

$sizeKb = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)
Write-Host ""
Write-Host "Packaged: $zipPath  ($sizeKb KB)"
Write-Host "Included:  $($included -join ', ')"
