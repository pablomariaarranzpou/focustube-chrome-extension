# Cuts a GitHub Release for the current manifest version and uploads the
# packaged extension .zip as a downloadable release asset.
#
#   Preview (no publishing):  powershell -ExecutionPolicy Bypass -File .\release.ps1 -DryRun
#   Publish for real:         powershell -ExecutionPolicy Bypass -File .\release.ps1
#
# Requires the GitHub CLI (`gh`) to be installed and authenticated.

param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# 1. Version / tag / zip path from manifest.json
$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$version  = $manifest.version
$tag      = "v$version"
$zip      = Join-Path $root "focustube-$version.zip"

# 2. Build the clean package (same script the store upload uses)
Write-Host "Building package for $version ..."
& (Join-Path $root 'package.ps1')
if (-not (Test-Path $zip)) { throw "Package not found: $zip" }

# 3. Release notes = the matching section of CHANGELOG.md
$notes = ''
$changelog = Join-Path $root 'CHANGELOG.md'
if (Test-Path $changelog) {
  $capture = $false
  $buf = @()
  foreach ($line in (Get-Content $changelog -Encoding utf8)) {
    if ($line -match ('^## \[' + [regex]::Escape($version) + '\]')) { $capture = $true; continue }
    if ($capture -and $line -match '^## \[') { break }
    if ($capture) { $buf += $line }
  }
  $notes = ($buf -join "`n").Trim()
  $notes = ($notes -replace '(\r?\n)*-{3,}\s*$', '').Trim()  # drop the trailing '---' separator
}
if (-not $notes) { $notes = "FocusTube $version" }

# 4. Don't clobber an existing release. gh prints "release not found" to
#    stderr when the tag is new, so relax strict-error mode for this one call
#    and decide from the exit code instead.
$ErrorActionPreference = 'Continue'
gh release view $tag 1>$null 2>$null
$releaseExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = 'Stop'
if ($releaseExists) {
  throw "Release $tag already exists. Bump the version in manifest.json, or remove it with: gh release delete $tag --cleanup-tag"
}

# 5. Preview or publish
if ($DryRun) {
  Write-Host ""
  Write-Host "--- DRY RUN (nothing published) ---"
  Write-Host "Tag:    $tag"
  Write-Host "Asset:  $zip"
  Write-Host "Title:  FocusTube $version"
  Write-Host "Notes:"
  Write-Host $notes
  exit 0
}

$notesFile = Join-Path ([System.IO.Path]::GetTempPath()) "ft-notes-$version.md"
Set-Content -Path $notesFile -Value $notes -Encoding utf8
try {
  Write-Host "Creating GitHub release $tag ..."
  gh release create $tag $zip --target main --title "FocusTube $version" --notes-file $notesFile
  if ($LASTEXITCODE -ne 0) { throw "gh release create failed (exit $LASTEXITCODE)." }
  Write-Host ""
  Write-Host "Released $tag with $([System.IO.Path]::GetFileName($zip)) attached."
} finally {
  Remove-Item $notesFile -Force -ErrorAction SilentlyContinue
}
