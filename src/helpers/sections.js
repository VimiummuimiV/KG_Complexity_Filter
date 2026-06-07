const SECTIONS_KEY = 'complexityFilterSections';

const DEFAULTS = {
    balance:   true,
    penalties: true,
    fingers:   true,
    bigrams:   true,
    words:     true,
};

const load = () => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SECTIONS_KEY)) }; }
    catch { return { ...DEFAULTS }; }
};

const save = (state) => localStorage.setItem(SECTIONS_KEY, JSON.stringify(state));

export const toggleSection = (panel, key) => {
    const state = load();
    state[key] = !state[key];
    save(state);
    panel.querySelector(`[data-section="${key}"]`)?.toggleAttribute('data-collapsed', !state[key]);
};

export const applyInitialSections = (panel) => {
    const state = load();
    for (const [key, open] of Object.entries(state))
        panel.querySelector(`[data-section="${key}"]`)?.toggleAttribute('data-collapsed', !open);
};

export const collapseAllExcept = (panel, key) => {
    const state = load();
    for (const k of Object.keys(state)) state[k] = k === key;
    save(state);
    for (const k of Object.keys(state))
        panel.querySelector(`[data-section="${k}"]`)?.toggleAttribute('data-collapsed', k !== key);
};