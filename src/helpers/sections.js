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

const applyState = (panel, state) => {
    for (const [key, open] of Object.entries(state))
        panel.querySelector(`[data-section="${key}"]`)?.toggleAttribute('data-collapsed', !open);
};

export const toggleSection = (panel, key) => {
    const state = load();
    state[key] = !state[key];
    save(state);
    applyState(panel, state);
};

export const applyInitialSections = (panel) => applyState(panel, load());

export const collapseAllExcept = (panel, key) => {
    const state = load();
    for (const k of Object.keys(state)) state[k] = k === key;
    save(state);
    applyState(panel, state);
};

export const toggleAllSections = (panel) => {
    const state = load();
    const open = !Object.values(state).some(v => v);
    for (const k of Object.keys(state)) state[k] = open;
    save(state);
    applyState(panel, state);
};