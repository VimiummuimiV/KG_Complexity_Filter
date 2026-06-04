const VIEW_KEY = 'complexityFilterView';

export const VIEWS = ['full', 'summary', 'minimal'];

export const getView = () => localStorage.getItem(VIEW_KEY) ?? 'full';

export const setView = (panel, v) => {
    panel.setAttribute('data-view', v);
    localStorage.setItem(VIEW_KEY, v);
};

export const cycleView = (panel) => {
    const current = panel.getAttribute('data-view') ?? 'full';
    const next = VIEWS[(VIEWS.indexOf(current) + 1) % VIEWS.length];
    setView(panel, next);
};

export const applyInitialView = (panel) => setView(panel, getView());