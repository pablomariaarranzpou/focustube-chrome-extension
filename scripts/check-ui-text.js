#!/usr/bin/env node
/**
 * Checks every translated label in the popup against the limits in
 * scripts/ui-text-budgets.js, and fails if one is too long to fit.
 *
 *   node scripts/check-ui-text.js
 *
 * Exits non-zero when something is over budget, so it can gate a release.
 * Run it after touching _locales/, and before publishing.
 */

const fs = require('fs');
const path = require('path');
const { ELEMENTS, PX_PER_CHAR, estimateWidth } = require('./ui-text-budgets');

const LOCALES_DIR = path.join(__dirname, '..', '_locales');

const locales = fs
  .readdirSync(LOCALES_DIR)
  .filter((name) => fs.existsSync(path.join(LOCALES_DIR, name, 'messages.json')))
  .sort();

const failures = [];
const unmeasured = [];
let checked = 0;

for (const locale of locales) {
  if (PX_PER_CHAR[locale] === undefined) {
    unmeasured.push(locale);
    continue;
  }

  const messages = JSON.parse(
    fs.readFileSync(path.join(LOCALES_DIR, locale, 'messages.json'), 'utf8')
  );

  for (const [element, spec] of Object.entries(ELEMENTS)) {
    for (const key of spec.keys) {
      const entry = messages[key];
      if (!entry) continue; // key genuinely absent from this locale

      const text = entry.message;
      const budget = spec.lineWidth * spec.maxLines;
      const estimated = estimateWidth(text, locale, spec.fontSize);
      checked += 1;

      if (estimated > budget) {
        failures.push({
          locale,
          element,
          key,
          text,
          chars: text.length,
          estimated: Math.round(estimated),
          budget,
          lines: (estimated / spec.lineWidth).toFixed(1),
          maxLines: spec.maxLines,
        });
      }
    }
  }
}

if (unmeasured.length) {
  console.error(
    `\nNo character-width measurement for: ${unmeasured.join(', ')}\n` +
      'Run `node scripts/measure-ui-text.js` and add them to scripts/ui-text-budgets.js.\n'
  );
}

if (failures.length) {
  console.error(`\n${failures.length} label(s) are too long:\n`);
  for (const f of failures) {
    console.error(`  ${f.locale} · ${f.element} · ${f.key}`);
    console.error(`    "${f.text}"`);
    console.error(
      `    ${f.chars} chars, about ${f.estimated}px = ~${f.lines} lines ` +
        `(budget ${f.budget}px, max ${f.maxLines} lines)\n`
    );
  }
  console.error(
    'Shorten these, or measure them in the browser first — the estimate leans\n' +
      'high, so a small overshoot may still render fine.\n'
  );
  process.exit(1);
}

if (unmeasured.length) process.exit(1);

console.log(
  `All ${checked} labels across ${locales.length} languages fit their budget.`
);
