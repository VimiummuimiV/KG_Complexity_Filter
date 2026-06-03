const THEME_KEY = 'complexityFilterTheme';
const DARK   = 'dark';
const LIGHT  = 'light';

export const getTheme = () => localStorage.getItem(THEME_KEY) ?? DARK;

export const setTheme = (panel, t) => {
    panel.setAttribute('data-complexity-filter-theme', t);
    localStorage.setItem(THEME_KEY, t);
};

export const toggleTheme = (panel) => {
    const next = panel.getAttribute('data-complexity-filter-theme') === DARK ? LIGHT : DARK;
    setTheme(panel, next);

    const btn       = panel.querySelector('.panel-theme');
    const iconIndex = next === LIGHT ? 0 : 1;
    const cls       = next === LIGHT ? 'spin' : 'swing';
    const icon      = btn.querySelectorAll('.panel-icon')[iconIndex];

    icon.classList.remove('spin', 'swing');
    void icon.offsetWidth; // reflow to restart animation
    icon.classList.add(cls);
    icon.addEventListener('animationend', () => icon.classList.remove(cls), { once: true });
};

export const applyInitialTheme = (panel) => setTheme(panel, getTheme());