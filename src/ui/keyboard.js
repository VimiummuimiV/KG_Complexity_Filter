// ─── helpers/keyboard.js ─────────────────────────────────────────────────────
// Virtual keyboard panel — looks like a real keyboard with finger-zone tints.
// Open:   Shift+Click on the layout chip (.meta-value-btn).
// Update: called from render() on every lang/layout change.

import { configs } from '../analysis/weights/weightsIndex.js';
import { makeDraggable } from '../helpers/drag.js';
import { getStrings } from '../helpers/lang.js';
import { buildToggleBtn } from '../helpers/button.js';

const KEYBOARD_ID   = 'kg-keyboard-panel';
const KB_MODE_KEY   = 'kg-kb-mode';   // localStorage: 'zones' | 'heat'
const KB_COUNT_KEY  = 'kg-kb-count';  // localStorage: 'on' | 'off'

// ─── Special keys ─────────────────────────────────────────────────────────────
// Rows 0–3: { left, right } flanking alpha keys. bottom: space row. cls → width.

const SPECIAL_KEYS = {
    0: { left: null, right: { label: '⌫', cls: 'backspace' } }, // Digit row
    1: { left: { label: 'Tab',   cls: 'tab' }, right: null }, // Top row
    2: { left: { label: 'Caps',  cls: 'caps' }, right: { label: 'Enter', cls: 'enter' } }, // Home row
    3: { left: { label: 'Shift', cls: 'shift-l' }, right: { label: 'Shift', cls: 'shift-r' } }, // Shift row
    bottom: [ // Space row
        { label: 'Ctrl',  cls: 'ctrl'  },
        { label: 'Win',   cls: 'win'   },
        { label: 'Alt',   cls: 'alt'   },
        { label: 'Space', cls: 'space' },
        { label: 'Alt',   cls: 'alt'   },
        { label: 'Win',   cls: 'win'   },
        { label: 'Menu',  cls: 'menu'  },
        { label: 'Ctrl',  cls: 'ctrl'  },
    ],
};

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
    for (const [ch, [finger, row, pos]] of Object.entries(layout)) {
        rows[row].push({ ch, finger, pos });
    }
    for (const r of [0, 1, 2, 3]) {
        rows[r].sort((a, b) => a.pos - b.pos);
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

const buildKey = (ch, finger, shiftLabels, keyCounts, keyHeat) => {
    const key = el('div', `kg-key kg-key--f${finger}`);
    key.dataset.finger = finger;

    const count = el('span', 'kg-key-count');

    const shiftCh = shiftLabels[ch];
    if (shiftCh) {
        const top = el('span', 'kg-key-shift');
        top.textContent = shiftCh;
        key.appendChild(top);
    }

    const main = el('span', 'kg-key-main');
    main.textContent = ch === ch.toLowerCase() ? ch.toUpperCase() : ch;

    if (keyCounts) {
        const n = keyCounts.get(ch) ?? 0;
        count.textContent = n > 0 ? n : '';
    }

    if (keyHeat) {
        const heat = keyHeat.get(ch) ?? 0;
        if (heat > 0) key.style.setProperty('--key-heat', heat.toFixed(3));
    }

    key.appendChild(count);
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

const buildKeyboard = (layoutLang, layoutName, keyCounts) => {
    const cfg = configs.find(c => c.layoutLang === layoutLang && c.layoutName === layoutName)
             ?? configs.find(c => c.layoutLang === layoutLang);
    if (!cfg) return null;

    const { layout, shiftMap } = cfg;
    const shiftLabels = buildShiftLabels(shiftMap);
    const rows        = keysByRow(layout);
    const maxCount = keyCounts ? Math.max(0, ...keyCounts.values()) : 0;
    const keyHeat  = keyCounts && maxCount > 0
        ? new Map([...keyCounts].map(([k, v]) => [k, v / maxCount]))
        : null;

    const board = el('div', 'kg-keyboard');

    // Rows 0–3: special-left · alpha keys · special-right
    for (const r of [0, 1, 2, 3]) {
        const rowEl = el('div', `kg-kb-row kg-kb-row--${r}`);
        const { left, right } = SPECIAL_KEYS[r];

        if (left) rowEl.appendChild(buildSpecialKey(left.label, left.cls));
        for (const { ch, finger } of rows[r]) {
            rowEl.appendChild(buildKey(ch, finger, shiftLabels, keyCounts, keyHeat));
        }
        if (right) rowEl.appendChild(buildSpecialKey(right.label, right.cls));

        board.appendChild(rowEl);
    }

    // Space row: Ctrl Win Alt Space Alt Win Menu Ctrl
    const bottomRow = el('div', 'kg-kb-row kg-kb-row--bottom');
    for (const { label, cls } of SPECIAL_KEYS.bottom) {
        bottomRow.appendChild(buildSpecialKey(label, cls));
    }
    board.appendChild(bottomRow);

    return board;
};

// ─── Mode toggle (zones ↔ heat) ───────────────────────────────────────────────

const loadMode   = ()      => localStorage.getItem(KB_MODE_KEY)  ?? 'zones';
const saveMode   = (mode)  => localStorage.setItem(KB_MODE_KEY,  mode);
const applyMode  = (kb, mode)  => { kb.dataset.kbMode  = mode;  };

const buildModeBtn = (keyboard) => buildToggleBtn(
    'kg-kb-mode-btn',
    ['fire-fill', 'contrast-fill'],
    () => {
        const s = getStrings();
        return `[${s.tooltipClick}]${keyboard.dataset.kbMode === 'heat' ? s.tooltipKbModeZones : s.tooltipKbModeHeat}`;
    },
    () => {
        const next = keyboard.dataset.kbMode === 'zones' ? 'heat' : 'zones';
        applyMode(keyboard, next);
        saveMode(next);
    },
);

// ─── Count toggle (off ↔ on) ──────────────────────────────────────────────────

const loadCount  = ()      => localStorage.getItem(KB_COUNT_KEY) ?? 'off';
const saveCount  = (state) => localStorage.setItem(KB_COUNT_KEY, state);
const applyCount = (kb, state) => { kb.dataset.kbCount = state; };

const buildCountBtn = (keyboard) => buildToggleBtn(
    'kg-kb-count-btn',
    ['hashtag'],
    () => {
        const s = getStrings();
        return `[${s.tooltipClick}]${keyboard.dataset.kbCount === 'on' ? s.tooltipKbCountOff : s.tooltipKbCountOn}`;
    },
    () => {
        const next = keyboard.dataset.kbCount === 'on' ? 'off' : 'on';
        applyCount(keyboard, next);
        saveCount(next);
    },
);

// ─── Keyboard lifecycle ───────────────────────────────────────────────────────

export const getKeyboard  = () => document.getElementById(KEYBOARD_ID);
export const closeKeyboard = () => getKeyboard()?.remove();

export const openKeyboard = (panel, layoutLang, layoutName, keyCounts) => {
    closeKeyboard();

    const keyboard = el('div');
    keyboard.id = KEYBOARD_ID;
    keyboard.dataset.complexityFilterTheme = panel.dataset.complexityFilterTheme ?? 'dark';
    applyMode(keyboard,  loadMode());
    applyCount(keyboard, loadCount());

    const board = buildKeyboard(layoutLang, layoutName, keyCounts);
    if (!board) return;

    const header  = el('div', 'kg-kb-header');
    const title   = el('span', 'kg-kb-title');
    title.textContent = `${layoutLang} · ${layoutName}`;

    const closeBtn = buildToggleBtn(
        'kg-kb-close',
        ['close-line'],
        () => getStrings().btnClose,
        closeKeyboard,
    );

    const btnGroup = el('div', 'panel-btn-group');
    btnGroup.appendChild(buildCountBtn(keyboard));
    btnGroup.appendChild(buildModeBtn(keyboard));
    btnGroup.appendChild(closeBtn);

    header.appendChild(title);
    header.appendChild(btnGroup);
    keyboard.appendChild(header);
    keyboard.appendChild(board);

    document.body.appendChild(keyboard);
    makeDraggable(keyboard, header, 'keyboardPanel');
};

export const updateKeyboard = (panel, layoutLang, layoutName, keyCounts) => {
    const keyboard = getKeyboard();
    if (!keyboard) return;

    keyboard.dataset.complexityFilterTheme = panel.dataset.complexityFilterTheme ?? 'dark';

    const old   = keyboard.querySelector('.kg-keyboard');
    const board = buildKeyboard(layoutLang, layoutName, keyCounts);
    if (!board) return;

    if (old) keyboard.replaceChild(board, old);
    else     keyboard.appendChild(board);

    keyboard.querySelector('.kg-kb-title').textContent = `${layoutLang} · ${layoutName}`;
};