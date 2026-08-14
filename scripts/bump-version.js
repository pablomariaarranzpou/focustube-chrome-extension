#!/usr/bin/env node
/**
 * Bumps the extension version everywhere it needs to live.
 *
 * Usage:
 *   node scripts/bump-version.js 2.5.5
 *
 * Updates:
 *   - manifest.json      the real, shipped source of truth
 *   - package.json       local dev file, gitignored, never shared — kept in
 *                         sync anyway so `npm test` reports the right version
 *   - package-lock.json  same as above
 *
 * Then prints a warning for any other file still mentioning the old version
 * number, so nothing gets missed silently (this is how the package.json/
 * manifest.json drift happened in the first place).
 *
 * Still manual after running this:
 *   - Add a CHANGELOG.md entry describing what changed. Can't be automated
 *     because the summary requires actually knowing what the release does.
 *   - Commit manifest.json. package.json/package-lock.json are gitignored on
 *     purpose (see .gitignore) — they never leave this machine, so there's
 *     nothing to commit there.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const newVersion = process.argv[2];

if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('Usage: node scripts/bump-version.js <version>  (e.g. 2.5.5)');
  process.exit(1);
}

const manifestPath = path.join(ROOT, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const oldVersion = manifest.version;

if (oldVersion === newVersion) {
  console.log(`Already at ${newVersion}, nothing to do.`);
  process.exit(0);
}

// manifest.json — the real, shipped source of truth.
manifest.version = newVersion;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`✓ manifest.json       ${oldVersion} -> ${newVersion}`);

// package.json — local-only (gitignored), kept in sync for local `npm test`.
const pkgPath = path.join(ROOT, 'package.json');
if (fs.existsSync(pkgPath)) {
  const raw = fs.readFileSync(pkgPath, 'utf8');
  const updated = raw.replace(/"version":\s*"[^"]+"/, `"version": "${newVersion}"`);
  if (updated !== raw) {
    fs.writeFileSync(pkgPath, updated, 'utf8');
    console.log(`✓ package.json        ${oldVersion} -> ${newVersion} (local only, gitignored)`);
  }
}

// package-lock.json — same story; only the first two "version" fields are
// this package's own (root + the self-referencing "" entry under packages).
const lockPath = path.join(ROOT, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  const raw = fs.readFileSync(lockPath, 'utf8');
  let count = 0;
  const updated = raw.replace(/"version":\s*"[^"]+"/g, (m) => {
    count += 1;
    return count <= 2 ? `"version": "${newVersion}"` : m;
  });
  if (updated !== raw) {
    fs.writeFileSync(lockPath, updated, 'utf8');
    console.log(`✓ package-lock.json   ${oldVersion} -> ${newVersion} (local only, gitignored)`);
  }
}

// Safety net: catch anything else still quoting the old number so it never
// gets missed silently again.
try {
  const hits = execSync(
    `git grep -l "${oldVersion}" -- . ":(exclude)node_modules" ":(exclude)package-lock.json" ":(exclude)dist" ":(exclude)docs" ":(exclude)CHANGELOG.md"`,
    { cwd: ROOT }
  ).toString().trim();
  if (hits) {
    console.log(`\n⚠ Still mentions ${oldVersion} — check these by hand:\n  ${hits.split('\n').join('\n  ')}`);
  }
} catch (e) {
  // git grep exits 1 when there are zero matches — that's the good outcome.
}

console.log(`\nStill manual: add a CHANGELOG.md entry for ${newVersion}, then commit manifest.json.`);
