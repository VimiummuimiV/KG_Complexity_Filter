// ─── helpers/notification.js ─────────────────────────────────────────────────
// Lightweight panel-scoped notification system.
// Toasts are absolutely positioned inside the panel, stack top-right,
// and auto-dismiss after a short hold + fade-out.

const PANEL_ID = 'complexity-filter-panel';

const TYPE_COLOR = {
    error:   'var(--clr-red)',
    warning: 'var(--clr-yellow)',
    success: 'var(--clr-green)',
    info:    'var(--clr-blue)',
};

const HOLD_MS   = 2000;
const FADE_MS   = 350;
const TOTAL_MS  = HOLD_MS + FADE_MS;

// notify(panel?, message, type?)
// panel defaults to the live panel in the DOM.
// type defaults to 'info'.
export const notify = (panel, message, type = 'info') => {
    const root = panel ?? document.getElementById(PANEL_ID);
    if (!root) return;

    let stack = root.querySelector('.kg-notification-stack');
    if (!stack) {
        stack = document.createElement('div');
        stack.className = 'kg-notification-stack';
        root.appendChild(stack);
    }

    const toast = document.createElement('div');
    toast.className = 'kg-notification';
    toast.style.setProperty('--notification-color', TYPE_COLOR[type] ?? TYPE_COLOR.info);
    toast.appendChild(document.createTextNode(message));
    stack.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('in'));

    setTimeout(() => {
        toast.classList.replace('in', 'out');
        setTimeout(() => toast.remove(), FADE_MS);
    }, HOLD_MS);
};