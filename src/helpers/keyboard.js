// ─── helpers/keyboard.js ─────────────────────────────────────────────────────
// Virtual keyboard overlay showing finger zones for the current layout.
// Open: Shift+Click on .meta-value-btn (layout chip).
// Updates in real-time when layout/lang changes while open.

import { configs } from '../analysis/weights/weightsIndex.js';

const OVERLAY_ID = 'kg-keyboard-overlay';
const ROW_ORDER  = [0, 1, 2, 3]; // digit → top → home → bottom

// ─── Build reversed shiftMap: base → shifted char(s) ─────────────────────────

const buildShiftLabels = (shiftMap) => {
    const map = {};
    for (const [shifted, base] of Object.entries(shiftMap)) {
        if (!map[base]) map[base] = shifted;
    }
    return map;
};

// ─── Group layout keys by row ─────────────────────────────────────────────────

const keysByRow = (layout) => {
    const rows = { 0: [], 1: [], 2: [], 3: [] };
    for (const [ch, [finger, row]] of Object.entries(layout)) {
        rows[row].push({ ch, finger });
    }
    // Deduplicate by finger per row (keep first occurrence — base key wins)
    for (const r of ROW_ORDER) {
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

// ─── Build overlay DOM ────────────────────────────────────────────────────────

const buildKeyboard = (layoutLang, layoutName) => {
    const cfg = configs.find(c => c.layoutLang === layoutLang && c.layoutName === layoutName)
             ?? configs.find(c => c.layoutLang === layoutLang);
    if (!cfg) return null;

    const { layout, shiftMap } = cfg;
    const shiftLabels = buildShiftLabels(shiftMap);
    const rows        = keysByRow(layout);

    const board = document.createElement('div');
    board.className = 'kg-keyboard';

    for (const r of ROW_ORDER) {
        const rowEl = document.createElement('div');
        rowEl.className = 'kg-kb-row';

        for (const { ch, finger } of rows[r]) {
            const key   = document.createElement('div');
            const hand  = finger < 5 ? 'L' : 'R';
            key.className = `kg-key kg-key--f${finger}`;
            key.dataset.hand   = hand;
            key.dataset.finger = finger;

            const main  = document.createElement('span');
            main.className = 'kg-key-main';
            main.textContent = ch.toUpperCase !== undefined ? ch.toUpperCase() : ch;

            const shiftCh = shiftLabels[ch];
            if (shiftCh) {
                const shift = document.createElement('span');
                shift.className = 'kg-key-shift';
                shift.textContent = shiftCh;
                key.appendChild(shift);
            }
            key.appendChild(main);
            rowEl.appendChild(key);
        }

        board.appendChild(rowEl);
    }

    return board;
};

// ─── Overlay open / close / update ───────────────────────────────────────────

const getOverlay = () => document.getElementById(OVERLAY_ID);

const closeOverlay = () => getOverlay()?.remove();

export const openKeyboard = (panel, layoutLang, layoutName) => {
    closeOverlay();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.dataset.complexityFilterTheme =
        panel.dataset.complexityFilterTheme ?? 'dark';

    const board = buildKeyboard(layoutLang, layoutName);
    if (!board) return;

    const header = document.createElement('div');
    header.className = 'kg-kb-header';

    const title = document.createElement('span');
    title.className = 'kg-kb-title';
    title.textContent = `${layoutLang} · ${layoutName}`;

    const close = document.createElement('button');
    close.className = 'kg-kb-close';
    close.textContent = '×';
    close.addEventListener('click', closeOverlay);

    header.appendChild(title);
    header.appendChild(close);
    overlay.appendChild(header);
    overlay.appendChild(board);

    document.body.appendChild(overlay);

    // Click outside to close
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

    // Sync theme
    overlay.dataset.complexityFilterTheme =
        panel.dataset.complexityFilterTheme ?? 'dark';

    // Rebuild board in place
    const old = overlay.querySelector('.kg-keyboard');
    const board = buildKeyboard(layoutLang, layoutName);
    if (!board) return;

    if (old) overlay.replaceChild(board, old);
    else overlay.appendChild(board);

    overlay.querySelector('.kg-kb-title').textContent = `${layoutLang} · ${layoutName}`;
};