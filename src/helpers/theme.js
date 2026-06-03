const THEME_KEY = 'complexityFilterTheme';
const DARK   = 'dark';
const LIGHT  = 'light';

export const getTheme = () => localStorage.getItem(THEME_KEY) ?? DARK;
export const setTheme = (panel, t) => {
    panel.setAttribute('data-complexity-filter-theme', t);
    localStorage.setItem(THEME_KEY, t);
};
export const toggleTheme = (panel) =>
    setTheme(panel, panel.getAttribute('data-complexity-filter-theme') === DARK ? LIGHT : DARK);

export const applyInitialTheme = (panel) => setTheme(panel, getTheme());