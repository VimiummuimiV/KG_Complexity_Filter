// ─── helpers/keyboardConfig.js ────────────────────────────────────────────────
// Persists the user's manually chosen keyboard (lang + layoutName).
// Per-voc lang override: { [vocId]: lang }
// Per-lang layout:       { [layoutLang]: layoutName }

const KEY_LANG   = 'complexityFilterVocLang';
const KEY_LAYOUT = 'complexityFilterLayout';

const loadLang = () => {
    try { return JSON.parse(localStorage.getItem(KEY_LANG)) ?? {}; }
    catch { return {}; }
};

export const getVocLang = (vocId) => loadLang()[vocId] ?? null;

export const setVocLang = (vocId, lang) => {
    const map = loadLang();
    map[vocId] = lang;
    localStorage.setItem(KEY_LANG, JSON.stringify(map));
};

const loadLayout = () => {
    try { return JSON.parse(localStorage.getItem(KEY_LAYOUT)) ?? {}; }
    catch { return {}; }
};

export const getLayout = (layoutLang) => loadLayout()[layoutLang] ?? null;

export const setLayout = (layoutLang, layoutName) => {
    const map = loadLayout();
    map[layoutLang] = layoutName;
    localStorage.setItem(KEY_LAYOUT, JSON.stringify(map));
};

// ─── Keyboard UI preferences ──────────────────────────────────────────────────
// Single key stores { open, mode, count } together.

const KEY_KB = 'complexityKbPrefs';

const KB_DEFAULTS = { open: false, mode: 'zones', count: 'off' };

const loadKbPrefs = () => {
    try { return { ...KB_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY_KB)) }; }
    catch { return { ...KB_DEFAULTS }; }
};

export const getKbPref = (field)        => loadKbPrefs()[field];
export const setKbPref = (field, value) => {
    const prefs = loadKbPrefs();
    prefs[field] = value;
    localStorage.setItem(KEY_KB, JSON.stringify(prefs));
};