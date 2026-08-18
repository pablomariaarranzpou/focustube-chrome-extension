'use strict';

/**
 * How much room each piece of text in the popup is allowed to take.
 *
 * This is the single place those limits live. `ui-text-budgets.test.js`
 * enforces them, so a translation that is too long fails the test suite
 * instead of quietly making the popup look broken for that language.
 *
 * Why this exists: the popup used to have no width of its own, so Chrome
 * sized the window around whatever the text measured. A long translation
 * stretched the window (see 2.5.6 in CHANGELOG.md). front.html now pins the
 * popup to 400px, which stops the window moving — but text that is too long
 * still wraps onto more and more lines, so it needs a limit of its own.
 *
 *
 * THE RULE
 *
 * A label may wrap onto a second line. It may never reach a third.
 *
 * One line for everything is not achievable: 134 strings across 37 of the 45
 * locales are already wider than a single line, and some (Tamil) would have to
 * lose more than half their length to fit. Two lines reads fine in a settings
 * popup and only two strings in the whole project ever broke it.
 *
 *
 * HOW THE WIDTHS ARE ESTIMATED
 *
 * Tests run in Node, which cannot measure rendered text, so width is estimated
 * as `characters x PX_PER_CHAR[locale] x fontSize`. PX_PER_CHAR was measured in
 * Chrome against the real popup, per locale, because a character is not a fixed
 * width across scripts: Hindi averages 0.44px per font-pixel, Japanese 1.0.
 * That is also why a plain character limit does not work here — Swahili's
 * heading is 55 characters and fits, Tamil's was 54 characters and did not.
 *
 * Each locale's number is the *widest* ratio measured for that locale, so the
 * estimate errs on the high side (it read Tamil's longest sub-option as 484px
 * where Chrome renders 445px). A string that passes is genuinely safe; a string
 * that fails may be borderline rather than broken — measure it in the browser
 * before deciding how much to cut.
 *
 * Re-measure with scripts/measure-ui-text.js if the popup's font or layout
 * changes.
 */

// front.html pins html/body to this; the card fills it.
const POPUP_WIDTH = 400;
// Tailwind p-8 on .extension-container, both sides.
const CARD_PADDING = 32;
const CONTENT_WIDTH = POPUP_WIDTH - CARD_PADDING * 2; // 336

const TOGGLE_SLIDER = 40; // .toggle-slider
const LABEL_GAP = 12; // Tailwind ml-3 between slider and label
const SUB_OPTION_INDENT = 48; // padding-left: 3rem on a sub-option row
const BUTTON_PADDING = 32; // Tailwind px-4, both sides
const TAB_PADDING = 8; // .tab-button padding, both sides

const MAX_LINES = 2;

/**
 * Every piece of text in the popup, grouped by how much room it has.
 * `lineWidth` is what fits on one line; `maxLines` is how many it may use.
 */
const ELEMENTS = {
  // Top-level toggle: sits after the slider. Tailwind text-lg.
  mainToggle: {
    lineWidth: CONTENT_WIDTH - TOGGLE_SLIDER - LABEL_GAP,
    fontSize: 18,
    maxLines: MAX_LINES,
    keys: [
      'hideShorts',
      'hideSuggestions',
      'hideComments',
      'minimalistHome',
      'disableAutoplay',
      'hideSidebar',
      'hideBlacklistedChannels',
      'hideBlacklistedWords',
    ],
  },

  // Indented sub-option under a toggle. Tailwind text-base, so it has both
  // less room and a smaller font than a main toggle.
  subToggle: {
    lineWidth: CONTENT_WIDTH - SUB_OPTION_INDENT - TOGGLE_SLIDER - LABEL_GAP,
    fontSize: 16,
    maxLines: MAX_LINES,
    keys: ['keepHistoryVisible', 'quickBlacklistButton'],
  },

  // Section heading above a blacklist. Full width, Tailwind text-xl.
  heading: {
    lineWidth: CONTENT_WIDTH,
    fontSize: 20,
    maxLines: MAX_LINES,
    keys: ['concentrationModeBlacklist', 'concentrationModeBlacklistWords'],
  },

  // Buttons. Tailwind text-lg with px-4.
  button: {
    lineWidth: CONTENT_WIDTH - BUTTON_PADDING,
    fontSize: 18,
    maxLines: MAX_LINES,
    keys: ['editBlacklistedChannels', 'editBlacklistedWords', 'add'],
  },

  // Tab labels share the width between them, and must stay on one line —
  // a wrapped tab bar looks broken rather than merely tall.
  tab: {
    lineWidth: Math.floor(CONTENT_WIDTH / 2) - TAB_PADDING,
    fontSize: 15.2,
    maxLines: 1,
    keys: ['tabFocusMode', 'tabSettings'],
  },
};

/**
 * Width of one character, per font-pixel, per locale. Measured in Chrome
 * against the real popup — see the note above. Highest observed ratio per
 * locale, so estimates lean high rather than low.
 */
const PX_PER_CHAR = {
  am: 0.6657, ar: 0.4523, ca: 0.5426, cs: 0.5001, da: 0.5052,
  de: 0.5413, el: 0.5956, en: 0.5618, en_AU: 0.5618, en_GB: 0.5618,
  es: 0.4927, es_419: 0.4959, et: 0.5258, fa: 0.5088, fil: 0.5343,
  fr: 0.513, gu: 0.5185, he: 0.5887, hi: 0.438, hr: 0.536,
  hu: 0.4867, id: 0.5428, it: 0.5434, ja: 1.0, kn: 0.614,
  ko: 0.9195, lt: 0.4884, lv: 0.5003, mr: 0.5087, ms: 0.5649,
  nl: 0.5317, no: 0.5105, pl: 0.5168, pt_BR: 0.5005, pt_PT: 0.5005,
  ro: 0.508, ru: 0.5666, sk: 0.5101, sl: 0.5229, sr: 0.554,
  sv: 0.5267, sw: 0.53, ta: 0.7569, te: 0.5737, tr: 0.5058,
};

/** Estimated rendered width of `text` in `locale`, at `fontSize` pixels. */
function estimateWidth(text, locale, fontSize) {
  const ratio = PX_PER_CHAR[locale];
  if (ratio === undefined) {
    throw new Error(
      `No character-width measurement for locale "${locale}". ` +
        'Add one with scripts/measure-ui-text.js before shipping it.'
    );
  }
  return text.length * ratio * fontSize;
}

module.exports = {
  POPUP_WIDTH,
  CONTENT_WIDTH,
  MAX_LINES,
  ELEMENTS,
  PX_PER_CHAR,
  estimateWidth,
};
