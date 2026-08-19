// Generates one static, pre-translated index.html per locale from i18n/content.json,
// plus sitemap.xml and robots.txt.
// Run with `node generate.js` after editing template.html or content.json. No npm deps.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/content.json'), 'utf8'));
const template = fs.readFileSync(path.join(ROOT, 'template.html'), 'utf8');
// The extension manifest is the single source of truth for the version we advertise.
const VERSION = JSON.parse(
  fs.readFileSync(path.join(ROOT, '..', 'manifest.json'), 'utf8')
).version;

const DEFAULT_LOCALE = 'en';
const SITE_ORIGIN = 'https://pablomariaarranzpou.github.io/focustube-chrome-extension';
const STORE_URL =
  'https://chromewebstore.google.com/detail/focustube-hide-youtube-sh/bolmmhkapeekgcjopdmnbmnhgaapbpdb';
const REPO_URL = 'https://github.com/pablomariaarranzpou/focustube-chrome-extension';
const STORE_REVIEWS_URL = STORE_URL + '/reviews';
// Real Chrome Web Store figures. Bump when they move — never inflate them.
const STORE_RATING = '4.8';
const STORE_REVIEW_COUNT = '29';
const OG_IMAGE = `${SITE_ORIGIN}/assets/focustube-logo.png`;
const OG_IMAGE_W = 1120;
const OG_IMAGE_H = 470;

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

// og:locale wants a POSIX-style language_TERRITORY pair.
const OG_LOCALES = {
  en: 'en_US', es: 'es_ES', es_419: 'es_419', fr: 'fr_FR', de: 'de_DE',
  it: 'it_IT', pt_PT: 'pt_PT', pt_BR: 'pt_BR', nl: 'nl_NL', ca: 'ca_ES',
  ro: 'ro_RO', pl: 'pl_PL', cs: 'cs_CZ', sk: 'sk_SK', sl: 'sl_SI',
  hr: 'hr_HR', sr: 'sr_RS', ru: 'ru_RU', el: 'el_GR', tr: 'tr_TR',
  hu: 'hu_HU', et: 'et_EE', lv: 'lv_LV', lt: 'lt_LT', sv: 'sv_SE',
  no: 'nb_NO', da: 'da_DK', id: 'id_ID', ms: 'ms_MY', fil: 'fil_PH',
  ja: 'ja_JP', ko: 'ko_KR', he: 'he_IL', ar: 'ar_AR', fa: 'fa_IR',
  hi: 'hi_IN', gu: 'gu_IN', mr: 'mr_IN', kn: 'kn_IN', ta: 'ta_IN',
  te: 'te_IN', sw: 'sw_KE', am: 'am_ET',
};

const locales = Object.keys(content);

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

// String.replace treats $& / $1 / $' in the replacement as special. Translated
// copy is arbitrary text, so always substitute through a function to keep it literal.
function sub(html, token, value) {
  return html.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), () => value);
}

function urlFor(code) {
  const folder = FOLDERS[code];
  return folder ? `${SITE_ORIGIN}/${folder}/` : `${SITE_ORIGIN}/`;
}

function hreflangFor(code) {
  const folder = FOLDERS[code];
  return folder ? folder : 'en';
}

function buildHreflangLinks() {
  const lines = locales.map(
    (code) => `  <link rel="alternate" hreflang="${hreflangFor(code)}" href="${urlFor(code)}" />`
  );
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/" />`);
  return lines.join('\n');
}

// Builds the language-suggestion banner's client script, embedded ONLY on the
// default (English) page. Data is the site's own hreflang tag and endonym
// name per locale - nothing new to translate or get wrong.
function buildLangSuggestScript() {
  const data = locales
    .filter((code) => code !== DEFAULT_LOCALE)
    .map((code) => ({ href: urlFor(code), tag: hreflangFor(code), name: content[code].name }));

  // </script> inside the embedded JSON would end the tag early.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return `    (function () {
      try {
        if (localStorage.getItem('ft_lang_choice')) return;
        var languages = (navigator.languages && navigator.languages.length)
          ? navigator.languages : [navigator.language || navigator.userLanguage || ''];
        var DATA = ${json};
        var match = null;
        for (var i = 0; i < languages.length && !match; i++) {
          var tag = String(languages[i]).toLowerCase();
          if (!tag || tag.indexOf('en') === 0) return; // English preferred - nothing to suggest
          var primary = tag.split('-')[0];
          var exact = null, byPrimaryGeneric = null, byPrimaryAny = null;
          for (var j = 0; j < DATA.length; j++) {
            var d = DATA[j];
            if (d.tag === tag) { exact = d; break; }
            if (d.tag === primary) byPrimaryGeneric = byPrimaryGeneric || d;
            else if (d.tag.split('-')[0] === primary) byPrimaryAny = byPrimaryAny || d;
          }
          match = exact || byPrimaryGeneric || byPrimaryAny;
        }
        if (!match) return;

        var bar = document.createElement('div');
        bar.className = 'lang-suggest';
        bar.setAttribute('role', 'note');
        var text = document.createElement('span');
        text.className = 'lang-suggest-text';
        text.textContent = 'This page is also available in ' + match.name + '.';
        var go = document.createElement('button');
        go.type = 'button';
        go.className = 'lang-suggest-switch';
        go.textContent = match.name;
        go.addEventListener('click', function () {
          try { localStorage.setItem('ft_lang_choice', '1'); } catch (e) {}
          window.location.href = match.href;
        });
        var dismiss = document.createElement('button');
        dismiss.type = 'button';
        dismiss.className = 'lang-suggest-dismiss';
        dismiss.setAttribute('aria-label', 'Dismiss');
        dismiss.textContent = '\\u00d7';
        dismiss.addEventListener('click', function () {
          try { localStorage.setItem('ft_lang_choice', '1'); } catch (e) {}
          bar.remove();
        });
        bar.appendChild(text);
        bar.appendChild(go);
        bar.appendChild(dismiss);
        document.body.appendChild(bar);
      } catch (e) {}
    })();`;
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

// Structured data. Deliberately no aggregateRating: inventing review scores is
// exactly what earns a Google structured-data manual action.
function buildJsonLd(code, c) {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${urlFor(code)}#app`,
        name: 'FocusTube',
        applicationCategory: 'BrowserApplication',
        applicationSubCategory: 'Chrome Extension',
        operatingSystem: 'Chrome',
        url: urlFor(code),
        installUrl: STORE_URL,
        downloadUrl: STORE_URL,
        softwareVersion: VERSION,
        description: c.d,
        image: OG_IMAGE,
        inLanguage: hreflangFor(code),
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: c.f.map(([title]) => title),
        author: { '@type': 'Person', name: 'Pablo María Arranz Pou' },
        maintainer: { '@type': 'Person', name: 'Pablo María Arranz Pou' },
        codeRepository: REPO_URL,
        license: `${REPO_URL}/blob/main/LICENSE`,
      },
      {
        '@type': 'WebSite',
        '@id': `${urlFor(code)}#website`,
        url: urlFor(code),
        name: 'FocusTube',
        description: c.d,
        inLanguage: hreflangFor(code),
        publisher: { '@type': 'Person', name: 'Pablo María Arranz Pou' },
      },
    ],
  };
  // "</script>" inside a <script> block would end it early; escape the angle bracket.
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

for (const code of locales) {
  const c = content[code];
  const folder = FOLDERS[code];
  const isDefault = code === DEFAULT_LOCALE;
  const root = folder ? '../' : '';
  const lang = hreflangFor(code);

  let html = template;

  const simple = {
    '{{LANG}}': lang,
    '{{DIR_ATTR}}': c.dir ? ` dir="${c.dir}"` : '',
    '{{TITLE}}': escapeHtml(c.t),
    '{{TITLE_ATTR}}': escapeAttr(c.t),
    '{{DESC}}': escapeAttr(c.d),
    '{{CANONICAL}}': urlFor(code),
    '{{OG_LOCALE}}': OG_LOCALES[code] || lang,
    '{{OG_IMAGE}}': OG_IMAGE,
    '{{OG_IMAGE_W}}': String(OG_IMAGE_W),
    '{{OG_IMAGE_H}}': String(OG_IMAGE_H),
    '{{HREFLANG_LINKS}}': buildHreflangLinks(),
    '{{JSONLD}}': buildJsonLd(code, c),
    '{{ROOT}}': root,
    '{{STORE_URL}}': STORE_URL,
    '{{REPO_URL}}': REPO_URL,
    '{{VERSION}}': escapeHtml(VERSION),
    '{{NAV_FEATURES}}': escapeHtml(c.nf),
    '{{NAV_INSTALL}}': escapeHtml(c.ni),
    '{{KICKER}}': escapeHtml(c.k),
    '{{H1}}': escapeHtml(c.h1),
    '{{LEAD}}': escapeHtml(c.lead),
    '{{CTA_PRIMARY}}': escapeHtml(c.cp),
    '{{CTA_SECONDARY}}': escapeHtml(c.cs),
    '{{STAT_NUMBER}}': escapeHtml(c.sn),
    '{{STAT_SUFFIX}}': escapeHtml(c.ss),
    '{{FEATURES_TITLE}}': escapeHtml(c.ft),
    '{{CTA2_TITLE}}': escapeHtml(c.c2t),
    '{{CTA2_LEAD}}': escapeHtml(c.c2l),
    '{{FOOTER_LINK}}': escapeHtml(c.flink),
    '{{LANG_OPTIONS}}': buildLangOptions(code, !!folder),
    '{{LANG_SUGGEST_SCRIPT}}': isDefault ? buildLangSuggestScript() : '',
    '{{SPOTLIGHT_H2}}': escapeHtml(c.sph),
    '{{MH_BADGE}}': escapeHtml(c.mh.badge),
    '{{MH_TITLE}}': escapeHtml(c.mh.title),
    '{{MH_TITLE_ATTR}}': escapeAttr(c.mh.title),
    '{{MH_BODY}}': escapeHtml(c.mh.body),
    '{{MODE_OFF}}': escapeHtml(c.modes.off),
    '{{MODE_ALWAYS}}': escapeHtml(c.modes.always),
    '{{MODE_TIMER}}': escapeHtml(c.modes.timer),
    '{{MODE_SCHEDULE}}': escapeHtml(c.modes.schedule),
    '{{PV_TITLE}}': escapeHtml(c.pv.t),
    '{{PV_A}}': escapeHtml(c.pv.a),
    '{{PV_B}}': escapeHtml(c.pv.b),
    '{{PV_C}}': escapeHtml(c.pv.c),
    '{{RV_LABEL}}': escapeHtml(c.rv),
    '{{RV_HEADING}}': escapeHtml(c.rvh),
    '{{STORE_REVIEWS_URL}}': STORE_REVIEWS_URL,
    '{{STORE_RATING}}': escapeHtml(STORE_RATING),
    '{{STORE_REVIEW_COUNT}}': escapeHtml(STORE_REVIEW_COUNT),
  };

  for (const [token, value] of Object.entries(simple)) {
    html = sub(html, token, value);
  }

  // F1..F6 are reused in several places (feature grid, carousel captions,
  // Focus Mode spotlight), so every one is a global replace.
  c.f.forEach(([title, desc], i) => {
    html = sub(html, `{{F${i + 1}_TITLE}}`, escapeHtml(title));
    html = sub(html, `{{F${i + 1}_DESC}}`, escapeHtml(desc));
  });

  const leftover = html.match(/{{[A-Z0-9_]+}}/g);
  if (leftover) {
    throw new Error(`${code}: unreplaced placeholders: ${[...new Set(leftover)].join(', ')}`);
  }

  const outDir = folder ? path.join(ROOT, folder) : ROOT;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log(`wrote ${folder ? folder + '/' : ''}index.html${isDefault ? ' (default)' : ''}`);
}

// ---- sitemap.xml: every locale, each listing its alternates ----
const today = new Date().toISOString().slice(0, 10);
const urls = locales
  .map((code) => {
    const alts = locales
      .map(
        (alt) =>
          `    <xhtml:link rel="alternate" hreflang="${hreflangFor(alt)}" href="${urlFor(alt)}" />`
      )
      .join('\n');
    return [
      '  <url>',
      `    <loc>${urlFor(code)}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      '    <changefreq>monthly</changefreq>',
      `    <priority>${code === DEFAULT_LOCALE ? '1.0' : '0.8'}</priority>`,
      alts,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/" />`,
      '  </url>',
    ].join('\n');
  })
  .join('\n');

fs.writeFileSync(
  path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`
);
console.log('wrote sitemap.xml');

fs.writeFileSync(
  path.join(ROOT, 'robots.txt'),
  `User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`
);
console.log('wrote robots.txt');
