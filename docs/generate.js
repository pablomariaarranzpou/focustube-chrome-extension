// Generates one static, pre-translated index.html per locale from i18n/content.json,
// plus sitemap.xml and robots.txt.
// Run with `node generate.js` after editing template.html or content.json. No npm deps.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/content.json'), 'utf8'));
const supportContent = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/support.json'), 'utf8'));
const template = fs.readFileSync(path.join(ROOT, 'template.html'), 'utf8');
const supportTemplate = fs.readFileSync(path.join(ROOT, 'support/template.html'), 'utf8');
// The extension manifest is the single source of truth for the version we advertise.
const VERSION = JSON.parse(
  fs.readFileSync(path.join(ROOT, '..', 'manifest.json'), 'utf8')
).version;

const DEFAULT_LOCALE = 'en';
// The site moved to a custom domain (docs/CNAME says focustube.io) but this
// constant was never updated, so every canonical link, hreflang tag, sitemap
// entry, robots.txt line and og:url/og:image on every one of the 43 generated
// pages pointed at the old GitHub Pages URL instead of the domain the site
// actually serves from — including the support page's own canonical, the
// extension's homepage_url, and its Help link, which all correctly say
// focustube.io. Search engines were being told the site canonically lives
// somewhere it doesn't.
const SITE_ORIGIN = 'https://focustube.io';
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

// A tiny, safe markdown for the support page's prose, where a translator
// needs *emphasis*, **strength** and the odd `code` word but should never be
// typing raw HTML. Escaping runs first, so the only tags that can end up in
// the page are the ones this function introduces itself - a typo in the
// source text can produce stray asterisks, never a broken or injected tag.
// [text](repo) is the one inline link this content uses; repoUrl is passed in
// rather than read from a module-level constant so this stays reusable.
function mdInline(raw, repoUrl) {
  let s = escapeHtml(raw);
  s = s.replace(/`([^`]+)`/g, (_, t) => `<code>${t}</code>`);
  s = s.replace(
    /\[([^\]]+)\]\(repo\)/g,
    (_, t) => `<a href="${repoUrl}" target="_blank" rel="noopener">${t}</a>`
  );
  s = s.replace(/\*\*([^*]+)\*\*/g, (_, t) => `<strong>${t}</strong>`);
  s = s.replace(/\*([^*]+)\*/g, (_, t) => `<em>${t}</em>`);
  return s;
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

// The support page is one directory below each locale's home page.
function urlForSupport(code) {
  return `${urlFor(code)}support/`;
}

function hreflangFor(code) {
  const folder = FOLDERS[code];
  return folder ? folder : 'en';
}

// urlFn lets the same builder serve both the home page (urlFor) and the
// support page (urlForSupport) without duplicating the hreflang logic.
function buildHreflangLinks(urlFn) {
  urlFn = urlFn || urlFor;
  const lines = locales.map(
    (code) => `  <link rel="alternate" hreflang="${hreflangFor(code)}" href="${urlFn(code)}" />`
  );
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${urlFn(DEFAULT_LOCALE)}" />`);
  return lines.join('\n');
}

// Builds the language-suggestion banner's client script, embedded ONLY on the
// default (English) page. Data is the site's own hreflang tag and endonym
// name per locale - nothing new to translate or get wrong. urlFn again lets
// this serve either the home page or the support page.
function buildLangSuggestScript(urlFn) {
  urlFn = urlFn || urlFor;
  const data = locales
    .filter((code) => code !== DEFAULT_LOCALE)
    .map((code) => ({ href: urlFn(code), tag: hreflangFor(code), name: content[code].name }));

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

// upLevels is how many "../" reach docs/ from the page being rendered: 0 or 1
// for a home page (docs/index.html vs docs/es/index.html), 1 or 2 for a
// support page one directory deeper (docs/support/ vs docs/es/support/).
// suffix appends 'support/' so the switcher lands on the same kind of page
// in the new language instead of always jumping to the home page.
function buildLangOptions(currentCode, upLevels, suffix) {
  suffix = suffix || '';
  const prefix = '../'.repeat(upLevels);
  return locales
    .map((code) => {
      const folder = FOLDERS[code];
      const href = folder ? `${prefix}${folder}/${suffix}` : `${prefix}${suffix}`;
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
    '{{LANG_OPTIONS}}': buildLangOptions(code, folder ? 1 : 0),
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
    '{{TAG_A}}': escapeHtml(c.tag.a),
    '{{TAG_B}}': escapeHtml(c.tag.b),
    '{{SKIP}}': escapeHtml(c.skip || 'Skip to content'),
    '{{THEME_LABEL}}': escapeAttr(c.theme.label),
    '{{THEME_LIGHT}}': escapeAttr(c.theme.light),
    '{{THEME_DARK}}': escapeAttr(c.theme.dark),
    '{{THEME_SYSTEM}}': escapeAttr(c.theme.system),
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

function buildSupportJsonLd(code, s) {
  const url = urlForSupport(code);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#page`,
    url,
    name: s.t,
    description: s.d,
    inLanguage: hreflangFor(code),
    isPartOf: { '@id': `${urlFor(code)}#website` },
    about: { '@id': `${urlFor(code)}#app` },
  };
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

// ---- One support page per locale, same loop shape as the home page above ----
const supportLocales = Object.keys(supportContent);
const missingSupport = locales.filter((code) => !supportLocales.includes(code));
if (missingSupport.length) {
  throw new Error(`docs/i18n/support.json is missing: ${missingSupport.join(', ')}`);
}

for (const code of locales) {
  const c = content[code]; // still needed for c.name, c.nf, c.ni, theme labels, etc.
  const s = supportContent[code];
  const folder = FOLDERS[code];
  const isDefault = code === DEFAULT_LOCALE;
  // One extra directory level deeper than the home page (docs/support/ vs
  // docs/es/support/), so this needs its own root and up-level count.
  const root = folder ? '../../' : '../';
  const lang = hreflangFor(code);

  let html = supportTemplate;

  const simple = {
    '{{LANG}}': lang,
    '{{DIR_ATTR}}': c.dir ? ` dir="${c.dir}"` : '',
    '{{TITLE}}': escapeHtml(s.t),
    '{{TITLE_ATTR}}': escapeAttr(s.t),
    '{{DESC}}': escapeAttr(s.d),
    '{{CANONICAL}}': urlForSupport(code),
    '{{OG_LOCALE}}': OG_LOCALES[code] || lang,
    '{{OG_IMAGE}}': OG_IMAGE,
    '{{OG_IMAGE_W}}': String(OG_IMAGE_W),
    '{{OG_IMAGE_H}}': String(OG_IMAGE_H),
    '{{HREFLANG_LINKS}}': buildHreflangLinks(urlForSupport),
    '{{JSONLD}}': buildSupportJsonLd(code, s),
    '{{ROOT}}': root,
    '{{STORE_URL}}': STORE_URL,
    '{{REPO_URL}}': REPO_URL,
    '{{VERSION}}': escapeHtml(VERSION),
    '{{NAV_FEATURES}}': escapeHtml(c.nf),
    '{{NAV_INSTALL}}': escapeHtml(c.ni),
    '{{SKIP}}': escapeHtml(c.skip || 'Skip to content'),
    '{{THEME_LABEL}}': escapeAttr(c.theme.label),
    '{{THEME_LIGHT}}': escapeAttr(c.theme.light),
    '{{THEME_DARK}}': escapeAttr(c.theme.dark),
    '{{THEME_SYSTEM}}': escapeAttr(c.theme.system),
    '{{LANG_OPTIONS}}': buildLangOptions(code, folder ? 2 : 1, 'support/'),
    '{{LANG_SUGGEST_SCRIPT}}': isDefault ? buildLangSuggestScript(urlForSupport) : '',

    '{{SUP_KICKER}}': escapeHtml(s.k),
    '{{SUP_H1}}': escapeHtml(s.h1),
    '{{SUP_LEAD}}': escapeHtml(s.lead),
    '{{SUP_TOC}}': escapeHtml(s.toc),
    '{{SUP_QA1_H2}}': escapeHtml(s.qa1h2),
    '{{SUP_QA1_INTRO}}': escapeHtml(s.qa1intro),
    '{{SUP_STEP1_H3}}': mdInline(s.steps[0].h3, REPO_URL),
    '{{SUP_STEP1_P1}}': mdInline(s.steps[0].p[0], REPO_URL),
    '{{SUP_STEP1_P2}}': mdInline(s.steps[0].p[1], REPO_URL),
    '{{SUP_STEP2_H3}}': mdInline(s.steps[1].h3, REPO_URL),
    '{{SUP_STEP2_P1}}': mdInline(s.steps[1].p[0], REPO_URL),
    '{{SUP_STEP3_H3}}': mdInline(s.steps[2].h3, REPO_URL),
    '{{SUP_STEP3_P1}}': mdInline(s.steps[2].p[0], REPO_URL),
    '{{SUP_STEP3_P2}}': mdInline(s.steps[2].p[1], REPO_URL),
    '{{SUP_STEP4_H3}}': mdInline(s.steps[3].h3, REPO_URL),
    '{{SUP_STEP4_P1}}': mdInline(s.steps[3].p[0], REPO_URL),
    '{{SUP_QA1_NOTE}}': mdInline(s.qa1note, REPO_URL),

    '{{SUP_QA2_H2}}': escapeHtml(s.qa2h2),
    '{{SUP_QA2_P1}}': mdInline(s.qa2p[0], REPO_URL),
    '{{SUP_QA2_P2}}': mdInline(s.qa2p[1], REPO_URL),
    '{{SUP_QA2_BTN}}': escapeHtml(s.qa2btn),

    '{{SUP_QA3_H2}}': escapeHtml(s.qa3h2),
    '{{SUP_QA3_P1}}': mdInline(s.qa3p[0], REPO_URL),

    '{{SUP_QA4_H2}}': escapeHtml(s.qa4h2),
    '{{SUP_QA4_P1}}': mdInline(s.qa4p[0], REPO_URL),
    '{{SUP_QA4_P2}}': mdInline(s.qa4p[1], REPO_URL),

    '{{SUP_QA5_H2}}': escapeHtml(s.qa5h2),
    '{{SUP_QA5_P1}}': mdInline(s.qa5p[0], REPO_URL),
    '{{SUP_QA5_BTN}}': escapeHtml(s.qa5btn),

    '{{SUP_BACK}}': escapeHtml(s.back),
  };

  for (const [token, value] of Object.entries(simple)) {
    html = sub(html, token, value);
  }

  const leftover = html.match(/{{[A-Z0-9_]+}}/g);
  if (leftover) {
    throw new Error(`${code} support: unreplaced placeholders: ${[...new Set(leftover)].join(', ')}`);
  }

  const outDir = folder ? path.join(ROOT, folder, 'support') : path.join(ROOT, 'support');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log(`wrote ${folder ? folder + '/' : ''}support/index.html${isDefault ? ' (default)' : ''}`);
}

// ---- sitemap.xml: every locale, each listing its alternates ----
const today = new Date().toISOString().slice(0, 10);

function buildUrlEntries(urlFn, priority) {
  return locales
    .map((code) => {
      const alts = locales
        .map(
          (alt) =>
            `    <xhtml:link rel="alternate" hreflang="${hreflangFor(alt)}" href="${urlFn(alt)}" />`
        )
        .join('\n');
      return [
        '  <url>',
        `    <loc>${urlFn(code)}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        '    <changefreq>monthly</changefreq>',
        `    <priority>${code === DEFAULT_LOCALE ? priority : '0.8'}</priority>`,
        alts,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFn(DEFAULT_LOCALE)}" />`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');
}

const urls = buildUrlEntries(urlFor, '1.0') + '\n' + buildUrlEntries(urlForSupport, '0.6');

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
