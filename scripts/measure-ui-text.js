#!/usr/bin/env node
/**
 * Prints a snippet that re-measures the character widths in
 * scripts/ui-text-budgets.js.
 *
 * Those numbers describe how wide a character actually renders in each
 * language, which Node cannot work out on its own — it has no font engine. So
 * the measuring happens in Chrome, against the real popup, and the result gets
 * pasted back into the budgets file.
 *
 * Run this when the popup's font, font sizes or layout change, or when adding
 * a locale the table doesn't cover yet (the test fails and names it).
 *
 *   node scripts/measure-ui-text.js
 *
 * Then follow the printed steps.
 */

const KEYS = [
  'hideShorts',
  'hideSuggestions',
  'hideComments',
  'minimalistHome',
  'disableAutoplay',
  'hideSidebar',
  'hideBlacklistedChannels',
  'hideBlacklistedWords',
  'keepHistoryVisible',
  'quickBlacklistButton',
  'concentrationModeBlacklist',
  'concentrationModeBlacklistWords',
  'editBlacklistedChannels',
  'editBlacklistedWords',
];

const snippet = `
(async function () {
  const locales = ${JSON.stringify(require('fs').readdirSync(require('path').join(__dirname, '..', '_locales')))};
  const keys = ${JSON.stringify(KEYS)};
  const REFERENCE_FONT_PX = 18; // Tailwind text-lg, what the probe below uses

  const messages = {};
  await Promise.all(
    locales.map(async (l) => {
      const res = await fetch('/_locales/' + l + '/messages.json');
      messages[l] = await res.json();
    })
  );

  // Measure inside the real card so the probe inherits the popup's font.
  const probe = document.createElement('span');
  probe.style.cssText =
    'position:absolute;visibility:hidden;white-space:nowrap;left:-99999px;';
  probe.className = 'text-lg font-medium';
  document.querySelector('.extension-container').appendChild(probe);

  const table = {};
  for (const [locale, msgs] of Object.entries(messages)) {
    let widest = 0;
    for (const key of keys) {
      const entry = msgs[key];
      if (!entry || entry.message.length < 6) continue;
      probe.textContent = entry.message;
      const perFontPx =
        probe.getBoundingClientRect().width / entry.message.length / REFERENCE_FONT_PX;
      if (perFontPx > widest) widest = perFontPx;
    }
    table[locale] = Number(widest.toFixed(4));
  }
  probe.remove();
  copy(JSON.stringify(table, null, 2));
  console.log('Copied to clipboard:', table);
})();
`.trim();

console.log(`
Re-measuring the per-locale character widths
============================================

1. Serve the extension folder over HTTP (the popup needs tailwind.min.css,
   and file:// will not load it — the measurements come out wrong if it is
   missing, because none of the Tailwind classes apply):

       python -m http.server 8098

2. Open http://localhost:8098/front.html in Chrome and open DevTools.

3. Paste this into the console. It copies the new table to your clipboard:

${snippet}

4. Paste the result over PX_PER_CHAR in scripts/ui-text-budgets.js.

5. Run the tests: node scripts/check-ui-text.js
`);
