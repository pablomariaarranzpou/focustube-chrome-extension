// Generates one static, pre-translated index.html per locale from i18n/content.json.
// Run with `node generate.js` after editing template.html or content.json. No npm deps.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/content.json'), 'utf8'));
const template = fs.readFileSync(path.join(ROOT, 'template.html'), 'utf8');

const DEFAULT_LOCALE = 'en';

// Chrome locale code -> URL folder / BCP-47 lang code used on the site.
const FOLDERS = {
  en: '', es: 'es', es_419: 'es-419', fr: 'fr', de: 'de', it: 'it',
  pt_PT: 'pt-pt', pt_BR: 'pt-br', nl: 'nl', ca: 'ca', ro: 'ro', pl: 'pl',
  cs: 'cs', sk: 'sk', sl: 'sl', hr: 'hr', sr: 'sr', ru: 'ru', el: 'el',
  tr: 'tr', hu: 'hu', et: 'et', lv: 'lv', lt: 'lt', sv: 'sv', no: 'no',
  da: 'da', id: 'id', ms: 'ms', fil: 'fil', ja: 'ja', ko: 'ko', he: 'he',
  ar: 'ar', fa: 'fa', hi: 'hi', gu: 'gu', mr: 'mr', kn: 'kn', ta: 'ta',
  te: 'te', sw: 'sw', am: 'am',
};

const locales = Object.keys(content);

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

const SITE_ORIGIN = 'https://pablomariaarranzpou.github.io/focustube-chrome-extension';

function buildHreflangLinks(currentCode) {
  const lines = locales.map((code) => {
    const folder = FOLDERS[code];
    const href = folder ? `${SITE_ORIGIN}/${folder}/` : `${SITE_ORIGIN}/`;
    const hreflang = folder ? folder.replace('_', '-') : 'en';
    return `  <link rel="alternate" hreflang="${hreflang}" href="${href}" />`;
  });
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/" />`);
  return lines.join('\n');
}

function buildLangOptions(currentCode, depth) {
  const prefix = depth ? '../' : '';
  return locales
    .map((code) => {
      const folder = FOLDERS[code];
      const href = folder ? `${prefix}${folder}/` : `${prefix}`;
      const selected = code === currentCode ? ' selected' : '';
      return `        <option value="${escapeAttr(href)}"${selected}>${escapeHtml(content[code].name)}</option>`;
    })
    .join('\n');
}

for (const code of locales) {
  const c = content[code];
  const folder = FOLDERS[code];
  const isDefault = code === DEFAULT_LOCALE;
  const root = folder ? '../' : '';
  const lang = folder ? folder.replace('_', '-') : 'en';

  let html = template
    .replace('{{LANG}}', lang)
    .replace('{{DIR_ATTR}}', c.dir ? ` dir="${c.dir}"` : '')
    .replace('{{TITLE}}', escapeHtml(c.t))
    .replace('{{DESC}}', escapeAttr(c.d))
    .replace('{{HREFLANG_LINKS}}', buildHreflangLinks(code))
    .replace(/{{ROOT}}/g, root)
    .replace('{{NAV_FEATURES}}', escapeHtml(c.nf))
    .replace('{{NAV_INSTALL}}', escapeHtml(c.ni))
    .replace('{{KICKER}}', escapeHtml(c.k))
    .replace('{{H1}}', escapeHtml(c.h1))
    .replace('{{LEAD}}', escapeHtml(c.lead))
    .replace(/{{CTA_PRIMARY}}/g, escapeHtml(c.cp))
    .replace('{{CTA_SECONDARY}}', escapeHtml(c.cs))
    .replace('{{STAT_NUMBER}}', escapeHtml(c.sn))
    .replace('{{STAT_SUFFIX}}', escapeHtml(c.ss))
    .replace('{{FEATURES_TITLE}}', escapeHtml(c.ft))
    .replace('{{CTA2_TITLE}}', escapeHtml(c.c2t))
    .replace('{{CTA2_LEAD}}', escapeHtml(c.c2l))
    .replace('{{FOOTER_LINK}}', escapeHtml(c.flink))
    .replace('{{LANG_OPTIONS}}', buildLangOptions(code, !!folder))
    .replace('{{SPOTLIGHT_H2}}', escapeHtml(c.sph))
    .replace(/{{MODE_OFF}}/g, escapeHtml(c.modes.off))
    .replace(/{{MODE_ALWAYS}}/g, escapeHtml(c.modes.always))
    .replace(/{{MODE_TIMER}}/g, escapeHtml(c.modes.timer))
    .replace(/{{MODE_SCHEDULE}}/g, escapeHtml(c.modes.schedule));

  // Global (not just first-match) replace: F5/F6 are reused both in the
  // regular feature grid's data source and in the Focus Mode spotlight below.
  c.f.forEach(([title, desc], i) => {
    html = html
      .replace(new RegExp(`{{F${i + 1}_TITLE}}`, 'g'), escapeHtml(title))
      .replace(new RegExp(`{{F${i + 1}_DESC}}`, 'g'), escapeHtml(desc));
  });

  const outDir = folder ? path.join(ROOT, folder) : ROOT;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log(`wrote ${folder ? folder + '/' : ''}index.html${isDefault ? ' (default)' : ''}`);
}
