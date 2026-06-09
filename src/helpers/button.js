// ─── helpers/button.js ───────────────────────────────────────────────────────
// Shared button factory for tooltip-wired toggle buttons.

import { createIcon }                              from '../icons/iconsIndex.js';
import { createCustomTooltip, updateTooltipContent } from '../helpers/tooltip.js';

// ─── Toggle button factory ────────────────────────────────────────────────────

export const buildToggleBtn = (cls, icons, getTooltip, onClick) => {
    const btn = document.createElement('button');
    btn.className = `panel-btn ${cls}`;
    for (const icon of icons) btn.appendChild(createIcon(icon));
    const update = () => updateTooltipContent(btn, getTooltip());
    btn.addEventListener('click', (e) => { onClick(e); update(); });
    btn.addEventListener('mouseenter', update);
    createCustomTooltip(btn, getTooltip(), 'stats', 0);
    return btn;
};