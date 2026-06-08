// ─── helpers/keyboard.js ─────────────────────────────────────────────────────
// Virtual keyboard overlay — looks like a real keyboard with finger-zone tints.
// Open:   Shift+Click on the layout chip (.meta-value-btn).
// Update: called from render() on every lang/layout change.

import { configs }     from '../analysis/weights/weightsIndex.js';
import { createIcon }  from '../icons/iconsIndex.js';

const OVERLAY_ID = 'kg-keyboard-overlay';

// ─── Special keys per row ─────────────────────────────────────────────────────
// Each entry: { label, cls }  — cls drives width via CSS modifier class.

const SPECIAL_LEFT = {
    0: { label: 'Esc',      cls: 'esc'  },
    1: { label: 'Tab',      cls: 'tab'  },
    2: { label: 'Caps',     cls: 'caps' },
    3: { label: 'Shift',    cls: 'shift-l' },
};

const SPECIAL_RIGHT = {
    0: { label: '⌫',        cls: 'backspace' },
    1: { label: '\\',       cls: 'backslash' },
    2: { label: 'Enter',    cls: 'enter' },
    3: { label: 'Shift',    cls: 'shift-r' },
};

const BOTTOM_ROW = [
    { label: 'Ctrl',  cls: 'ctrl'  },
    { label: 'Win',   cls: 'win'   },
    { label: 'Alt',   cls: 'alt'   },
    { label: 'Space', cls: 'space' },
    { label: 'Alt',   cls: 'alt'   },
    { label: 'Win',   cls: 'win'   },
    { label: 'Menu',  cls: 'menu'  },
    { label: 'Ctrl',  cls: 'ctrl'  },
];

// ─── Reverse shiftMap: base → shifted label ───────────────────────────────────

const buildShiftLabels = (shiftMap) => {
    const map = {};
    for (const [shifted, base] of Object.entries(shiftMap)) {
        if (!map[base]) map[base] = shifted;
    }
    return map;
};

// ─── Group layout keys by row, one slot per finger ───────────────────────────

const keysByRow = (layout) => {
    const rows = { 0: [], 1: [], 2: [], 3: [] };
    for (const [ch, [finger, row]] of Object.entries(layout)) {
        rows[row].push({ ch, finger });
    }
    for (const r of [0, 1, 2, 3]) {
        const seen = new Set();
        rows[r] = rows[r].filter(({ finger }) => {
            if (seen.has(finger)) return false;
            seen.add(finger);
            return true;
        });
        rows[r].sort((a, b) => a.finger - b.finger);
    }
    return rows;
};

// ─── DOM helpers ──────────────────────────────────────────────────────────────

const el = (tag, cls) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
};

// ─── Build one alpha/symbol key ───────────────────────────────────────────────

const buildKey = (ch, finger, shiftLabels) => {
    const key = el('div', `kg-key kg-key--f${finger}`);
    key.dataset.finger = finger;

    const shiftCh = shiftLabels[ch];
    if (shiftCh) {
        const top = el('span', 'kg-key-shift');
        top.textContent = shiftCh;
        key.appendChild(top);
    }

    const main = el('span', 'kg-key-main');
    main.textContent = ch === ch.toLowerCase() ? ch.toUpperCase() : ch;
    key.appendChild(main);

    return key;
};

// ─── Build special (fixed-label) key ─────────────────────────────────────────

const buildSpecialKey = (label, cls) => {
    const key = el('div', `kg-key kg-key--special kg-key--${cls}`);
    const span = el('span', 'kg-key-special-label');
    span.textContent = label;
    key.appendChild(span);
    return key;
};

// ─── Build full keyboard board ────────────────────────────────────────────────

const buildKeyboard = (layoutLang, layoutName) => {
    const cfg = configs.find(c => c.layoutLang === layoutLang && c.layoutName === layoutName)
             ?? configs.find(c => c.layoutLang === layoutLang);
    if (!cfg) return null;

    const { layout, shiftMap } = cfg;
    const shiftLabels = buildShiftLabels(shiftMap);
    const rows        = keysByRow(layout);

    const board = el('div', 'kg-keyboard');

    // Rows 0–3: special-left · alpha keys · special-right
    for (const r of [0, 1, 2, 3]) {
        const rowEl = el('div', `kg-kb-row kg-kb-row--${r}`);

        const specL = SPECIAL_LEFT[r];
        if (specL) rowEl.appendChild(buildSpecialKey(specL.label, specL.cls));

        for (const { ch, finger } of rows[r]) {
            rowEl.appendChild(buildKey(ch, finger, shiftLabels));
        }

        const specR = SPECIAL_RIGHT[r];
        if (specR) rowEl.appendChild(buildSpecialKey(specR.label, specR.cls));

        board.appendChild(rowEl);
    }

    // Bottom row: Ctrl Win Alt Space Alt Win Menu Ctrl
    const bottomRow = el('div', 'kg-kb-row kg-kb-row--bottom');
    for (const { label, cls } of BOTTOM_ROW) {
        bottomRow.appendChild(buildSpecialKey(label, cls));
    }
    board.appendChild(bottomRow);

    return board;
};

// ─── Overlay lifecycle ────────────────────────────────────────────────────────

const getOverlay = () => document.getElementById(OVERLAY_ID);
const closeOverlay = () => getOverlay()?.remove();

export const openKeyboard = (panel, layoutLang, layoutName) => {
    closeOverlay();

    const overlay = el('div');
    overlay.id = OVERLAY_ID;
    overlay.dataset.complexityFilterTheme = panel.dataset.complexityFilterTheme ?? 'dark';

    const board = buildKeyboard(layoutLang, layoutName);
    if (!board) return;

    // Header
    const header = el('div', 'kg-kb-header');

    const title = el('span', 'kg-kb-title');
    title.textContent = `${layoutLang} · ${layoutName}`;

    const closeBtn = el('button', 'panel-btn kg-kb-close');
    closeBtn.appendChild(createIcon('close-line'));
    closeBtn.addEventListener('click', closeOverlay);

    header.appendChild(title);
    header.appendChild(closeBtn);
    overlay.appendChild(header);
    overlay.appendChild(board);

    document.body.appendChild(overlay);

    const onOutside = (e) => {
        if (!overlay.contains(e.target)) {
            closeOverlay();
            document.removeEventListener('mousedown', onOutside);
        }
    };
    setTimeout(() => document.addEventListener('mousedown', onOutside), 0);
};

export const updateKeyboard = (panel, layoutLang, layoutName) => {
    const overlay = getOverlay();
    if (!overlay) return;

    overlay.dataset.complexityFilterTheme = panel.dataset.complexityFilterTheme ?? 'dark';

    const old   = overlay.querySelector('.kg-keyboard');
    const board = buildKeyboard(layoutLang, layoutName);
    if (!board) return;

    if (old) overlay.replaceChild(board, old);
    else     overlay.appendChild(board);

    overlay.querySelector('.kg-kb-title').textContent = `${layoutLang} · ${layoutName}`;
};