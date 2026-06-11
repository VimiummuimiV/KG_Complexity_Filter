// ─── keyboard.js ─────────────────────────────────────────────────────────────
// Virtual keyboard panel — looks like a real keyboard with finger-zone tints.
// Open:   Click the keyboard button in the panel header (Shift+Click = no save).
// Update: called from render() on every lang/layout change.

import { configs } from '../analysis/weights/weightsIndex.js';
import { makeDraggable } from '../helpers/drag.js';
import { getStrings } from '../helpers/lang.js';
import { buildToggleBtn } from '../helpers/button.js';
import { updateTooltipContent } from '../helpers/tooltip.js';
import { getKbPref, setKbPref } from '../helpers/keyboardConfig.js';
import { onHoverDelegate } from '../helpers/events.js';

const KEYBOARD_ID = 'kg-keyboard-panel';
let bridgeObserver = null;
let onShiftUp      = null;

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

const buildKey = (ch, finger, shiftLabels, keyCounts, keyCosts, heatCount, heatCost) => {
    const key = el('div', `kg-key kg-key--f${finger}`);
    key.dataset.finger  = finger;
    key.dataset.baseKey = ch;

    const count = el('span', 'kg-key-count');

    const shiftCh = shiftLabels[ch];
    if (shiftCh) {
        const top = el('span', 'kg-key-shift');
        top.textContent = shiftCh;
        key.appendChild(top);
        key.dataset.hasShift = '';
    }

    const main = el('span', 'kg-key-main');
    main.textContent = ch === ch.toLowerCase() ? ch.toUpperCase() : ch;

    const keyCount = keyCounts?.get(ch) || 0;
    const keyCost  = keyCosts?.get(ch)  || 0;
    count.dataset.countLabel   = keyCount || '';
    count.dataset.sumCostLabel = keyCost ? keyCost.toFixed(1) : '';
    count.dataset.avgCostLabel = (keyCost && keyCount) ? (keyCost / keyCount).toFixed(2) : '';

    if (heatCount) {
        const v = heatCount.get(ch) ?? 0;
        if (v > 0) key.style.setProperty('--key-heat-count', Math.max(0.12, v).toFixed(3));
    }
    if (heatCost) {
        const v = heatCost.get(ch) ?? 0;
        if (v > 0) key.style.setProperty('--key-heat-cost', Math.max(0.12, v).toFixed(3));
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

const buildKeyboard = (layoutLang, layoutName, keyCounts, keyCosts) => {
    const cfg = configs.find(c => c.layoutLang === layoutLang && c.layoutName === layoutName)
             ?? configs.find(c => c.layoutLang === layoutLang);
    if (!cfg) return null;

    const { layout, shiftMap } = cfg;
    const shiftLabels = buildShiftLabels(shiftMap);
    const rows        = keysByRow(layout);

    // --key-heat-count and --key-heat-cost are both normalised and stored per key.
    // CSS aliases --key-heat to the active one based on [data-kb-mode].
    const normalize = (map) => {
        if (!map) return null;
        const max = Math.max(0, ...map.values());
        return max > 0 ? new Map([...map].map(([k, v]) => [k, v / max])) : null;
    };
    const heatCount = normalize(keyCounts);
    const heatCost  = normalize(keyCosts);

    const board = el('div', 'kg-keyboard');

    // Rows 0–3: special-left · alpha keys · special-right
    for (const r of [0, 1, 2, 3]) {
        const rowEl = el('div', `kg-kb-row kg-kb-row--${r}`);
        const { left, right } = SPECIAL_KEYS[r];

        if (left) rowEl.appendChild(buildSpecialKey(left.label, left.cls));
        for (const { ch, finger } of rows[r]) {
            rowEl.appendChild(buildKey(ch, finger, shiftLabels, keyCounts, keyCosts, heatCount, heatCost));
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

    board.addEventListener('mousemove', (e) => {
        const key = e.target.closest('.kg-key[data-has-shift]');
        if (!key) return;
        const inTopHalf = e.clientY - key.getBoundingClientRect().top < key.offsetHeight / 2;
        key.toggleAttribute('data-count-bottom', inTopHalf);
    });
    board.addEventListener('mouseleave', (e) => {
        e.target.closest('.kg-key[data-has-shift]')?.removeAttribute('data-count-bottom');
    });

    return board;
};

// ─── Mode toggle (zones ↔ heat-count ↔ heat-cost) ────────────────────────────

const MODES = ['zones', 'heat-count', 'heat-cost'];

const MODE_TITLE_KEY = {
    zones:        'tooltipKbModeZonesShort',
    'heat-count': 'tooltipKbModeCountShort',
    'heat-cost':  'tooltipKbModeCostShort',
};

const setTitle = (kb, layoutLang, layoutName, mode) => {
    kb.dataset.kbMode = mode;
    const title = kb.querySelector('.kg-kb-title');
    if (!title) return;
    const s      = getStrings();
    const base   = `${layoutLang} · ${layoutName}`;
    const suffix = s[MODE_TITLE_KEY[mode]] ?? '';
    title.textContent = suffix ? `${base} · ${suffix}` : base;
};

const buildModeBtn = (keyboard, layoutLang, layoutName) => {
    const tooltipKey = { zones: 'tooltipKbModeZones', 'heat-count': 'tooltipKbModeHeatCount', 'heat-cost': 'tooltipKbModeHeatCost' };
    const shortKey   = { zones: 'tooltipKbModeZonesShort', 'heat-count': 'tooltipKbModeCountShort', 'heat-cost': 'tooltipKbModeCostShort' };
    const setMode    = (mode) => { setTitle(keyboard, layoutLang, layoutName, mode); setKbPref('mode', mode); };

    // anchor: first mode of the Shift+click pair. Set on first Shift+click, cleared on regular click or Shift-up.
    let anchor = null;

    const getTooltip = () => {
        const s      = getStrings();
        const cur    = keyboard.dataset.kbMode ?? 'zones';
        const fwd    = MODES[(MODES.indexOf(cur) + 1) % MODES.length];
        const a      = anchor ?? cur;
        const b      = MODES[(MODES.indexOf(a) + 1) % MODES.length];
        const toggle = s.tooltipKbModeToggle.replace('$1', s[shortKey[a]]).replace('$2', s[shortKey[b]]);
        return [
            `[${s.tooltipClick}]${s[tooltipKey[fwd]]}`,
            `[Shift + ${s.tooltipClick}]${toggle}`,
        ].join(' ');
    };

    const btn = buildToggleBtn(
        'kg-kb-mode-btn',
        ['fire-fill', 'contrast-fill'],
        getTooltip,
        (e) => {
            const cur = keyboard.dataset.kbMode ?? 'zones';
            if (e.shiftKey) {
                if (anchor === null) anchor = cur;
                const a = MODES.indexOf(anchor);
                const b = (a + 1) % MODES.length;
                setMode(keyboard.dataset.kbMode === anchor ? MODES[b] : anchor);
            } else {
                anchor = null;
                setMode(MODES[(MODES.indexOf(cur) + 1) % MODES.length]);
            }
        },
    );

    onShiftUp = (e) => { if (e.key === 'Shift') { anchor = null; updateTooltipContent(btn, getTooltip()); } };
    document.addEventListener('keyup', onShiftUp);

    return btn;
};

// ─── Count toggle (off ↔ on) ──────────────────────────────────────────────────

const applyCount = (kb, state) => { kb.dataset.kbCount = state; };

const buildCountBtn = (keyboard) => {
    const getTooltip = () => {
        const s = getStrings();
        const countLine = `[${s.tooltipClick}]${keyboard.dataset.kbCount === 'on' ? s.tooltipKbCountOff : s.tooltipKbCountOn}`;
        const costLine  = `[Shift + ${s.tooltipClick}]${keyboard.dataset.kbCostMode === 'avg' ? s.tooltipKbCostSum : s.tooltipKbCostAvg}`;
        return [countLine, costLine].join(' ');
    };

    const btn = buildToggleBtn(
        'kg-kb-count-btn',
        ['hashtag'],
        getTooltip,
        (e) => {
            if (e.shiftKey) {
                const next = keyboard.dataset.kbCostMode === 'avg' ? 'sum' : 'avg';
                keyboard.dataset.kbCostMode = next;
                setKbPref('costMode', next);
            } else {
                const next = keyboard.dataset.kbCount === 'on' ? 'off' : 'on';
                applyCount(keyboard, next);
                btn.classList.toggle('panel-btn--active', next === 'on');
                setKbPref('count', next);
            }
            updateTooltipContent(btn, getTooltip());
        },
    );
    btn.classList.toggle('panel-btn--active', getKbPref('count') === 'on');
    return btn;
};

// ─── Keyboard lifecycle ───────────────────────────────────────────────────────

export const getKeyboard  = () => document.getElementById(KEYBOARD_ID);
export const closeKeyboard = () => {
    bridgeObserver?.disconnect();
    bridgeObserver = null;
    if (onShiftUp) { document.removeEventListener('keyup', onShiftUp); onShiftUp = null; }
    getKeyboard()?.remove();
};

export const openKeyboard = (panel, layoutLang, layoutName, keyCounts, keyCosts) => {
    closeKeyboard();

    const keyboard = el('div');
    keyboard.id = KEYBOARD_ID;
    keyboard.dataset.complexityFilterTheme = panel.dataset.complexityFilterTheme ?? 'dark';
    applyCount(keyboard, getKbPref('count'));
    keyboard.dataset.kbCostMode = getKbPref('costMode') ?? 'sum';

    const board = buildKeyboard(layoutLang, layoutName, keyCounts, keyCosts);
    if (!board) return;

    const header  = el('div', 'kg-kb-header');
    const title   = el('span', 'kg-kb-title');

    const closeBtn = buildToggleBtn(
        'kg-kb-close',
        ['close-line'],
        () => getStrings().btnClose,
        closeKeyboard,
    );

    const btnGroup = el('div', 'panel-btn-group');
    btnGroup.appendChild(buildCountBtn(keyboard));
    btnGroup.appendChild(buildModeBtn(keyboard, layoutLang, layoutName));
    btnGroup.appendChild(closeBtn);

    header.appendChild(title);
    header.appendChild(btnGroup);
    keyboard.appendChild(header);
    keyboard.appendChild(board);
    setTitle(keyboard, layoutLang, layoutName, getKbPref('mode'));

    document.body.appendChild(keyboard);
    makeDraggable(keyboard, header, 'keyboardPanel');

    // ── Key hover: highlight matching chars in panel-text ────────────────────
    // Delegated on keyboard so it survives board replacement in updateKeyboard.
    // Active when heat mode or count mode is on (either gives per-key context).
    // spansByKey built once — hover does zero DOM querying.
    const spansByKey    = new Map();
    const penaltyToKeys = new Map();
    for (const span of panel.querySelectorAll('.panel-text span[data-key]')) {
        for (const base of span.dataset.key.split(' ')) {
            if (!spansByKey.has(base)) spansByKey.set(base, []);
            spansByKey.get(base).push(span);
        }
        for (const p of (span.dataset.penalty ?? '').split(' ').filter(Boolean)) {
            if (!penaltyToKeys.has(p)) penaltyToKeys.set(p, new Set());
            penaltyToKeys.get(p).add(span.dataset.key);
        }
    }
    const keyElsByBase = new Map(
        [...board.querySelectorAll('.kg-key[data-base-key]')].map(k => [k.dataset.baseKey, k])
    );

    const isHoverActive = () => keyboard.dataset.kbMode !== 'zones' || keyboard.dataset.kbCount === 'on';
    let activeSpans = [];

    onHoverDelegate(keyboard, '.kg-key:not(.kg-key--special)',
        (t) => {
            if (!isHoverActive()) return;
            for (const span of activeSpans) span.classList.remove('kg-key-hl');
            activeSpans = spansByKey.get(t.dataset.baseKey) ?? [];
            for (const span of activeSpans) span.classList.add('kg-key-hl');
            panel.dataset.activeKey = t.dataset.baseKey;
        },
        ()  => {
            for (const span of activeSpans) span.classList.remove('kg-key-hl');
            activeSpans = [];
            delete panel.dataset.activeKey;
        },
    );

    // ── Cross-panel bridge: panel penalty/finger hover → keyboard key glow ───
    // Watches panel data attributes and mirrors them onto the keyboard element
    // so CSS can dim/highlight keys without any per-key JS iteration.
    const bridgeAttrs = ['data-active-penalty', 'data-active-finger', 'data-active-hand', 'data-active-hotspot-keys'];
    const activePenaltyKeys = [];
    const activeHotspotKeys = [];
    const applyKeyHl = (activeArr, newKeys, cls) => {
        for (const k of activeArr) k.classList.remove(cls);
        activeArr.length = 0;
        activeArr.push(...newKeys.map(base => keyElsByBase.get(base)).filter(Boolean));
        for (const k of activeArr) k.classList.add(cls);
    };
    bridgeObserver = new MutationObserver(() => {
        for (const attr of bridgeAttrs) {
            const val = panel.getAttribute(attr);
            if (val !== null) keyboard.setAttribute(attr, val);
            else              keyboard.removeAttribute(attr);
        }
        applyKeyHl(activePenaltyKeys, [...(penaltyToKeys.get(panel.dataset.activePenalty) ?? [])], 'kg-key--penalty-hl');
        applyKeyHl(activeHotspotKeys, (panel.dataset.activeHotspotKeys ?? '').split(' '),          'kg-key--hotspot-hl');
    });
    bridgeObserver.observe(panel, { attributes: true, attributeFilter: bridgeAttrs });
};

export const updateKeyboard = (panel, layoutLang, layoutName, keyCounts, keyCosts) => {
    const keyboard = getKeyboard();
    if (!keyboard) return;

    keyboard.dataset.complexityFilterTheme = panel.dataset.complexityFilterTheme ?? 'dark';

    const old   = keyboard.querySelector('.kg-keyboard');
    const board = buildKeyboard(layoutLang, layoutName, keyCounts, keyCosts);
    if (!board) return;

    if (old) keyboard.replaceChild(board, old);
    else     keyboard.appendChild(board);

    setTitle(keyboard, layoutLang, layoutName, keyboard.dataset.kbMode ?? 'zones');
};