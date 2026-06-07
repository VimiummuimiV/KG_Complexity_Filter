// ─── helpers/vocLayout.js ────────────────────────────────────────────────────
// Persists the user's manually chosen layout (by config lang, e.g. 'ru'/'en')
// per vocabulary id. Stored as a flat JSON object: { [vocId]: lang }.

const KEY = 'complexityFilterVocLayouts';

const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; }
    catch { return {}; }
};

const save = (map) => localStorage.setItem(KEY, JSON.stringify(map));

export const getVocLayout = (vocId) => load()[vocId] ?? null;

export const setVocLayout = (vocId, lang) => {
    const map = load();
    map[vocId] = lang;
    save(map);
};