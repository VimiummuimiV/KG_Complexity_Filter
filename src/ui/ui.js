// ─── ui.js ───────────────────────────────────────────────────────────────────
// Builds and injects the KG Complexity panel entirely via DOM API.
// No innerHTML anywhere.

import '../styles/styles.scss';
import { createIcon } from '../icons';
import { makeDraggable } from '../helpers/drag';
import { applyInitialTheme, toggleTheme } from '../helpers/theme';

const ID = 'complexity-filter-panel';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

const el = (tag, cls) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
};

const elText = (tag, cls, str) => {
  const node = el(tag, cls);
  node.appendChild(document.createTextNode(str));
  return node;
};

const SCORE_TIERS = [
  { max: 35,       cls: 'easy',   label: 'Easy'     },
  { max: 65,       cls: 'medium', label: 'Moderate' },
  { max: Infinity, cls: 'hard',   label: 'Hard'     },
];

const scoreTier  = (s) => SCORE_TIERS.find(t => s < t.max);
const scoreColor = (s) => `var(--${scoreTier(s).cls})`;
const scoreLabel = (s) => scoreTier(s).label;

// ─── Section builders ─────────────────────────────────────────────────────────

const buildThemeBtn = (panel) => {
    const btn = el('button', 'panel-btn panel-theme');
    btn.title = 'Toggle theme';
    btn.appendChild(createIcon('sun-fill'));
    btn.appendChild(createIcon('moon-fill'));
    btn.addEventListener('click', () => toggleTheme(panel));
    return btn;
};

const buildHeader = (panel) => {
    const header = el('div', 'panel-header');

    header.appendChild(elText('span', 'panel-logo',  'KG'));
    header.appendChild(elText('span', 'panel-title', 'Typing Complexity · ЙЦУКЕН'));
    header.appendChild(buildThemeBtn(panel));

    const close = el('button', 'panel-btn panel-close');
    close.title = 'Close';
    close.appendChild(createIcon('close-line'));
    close.addEventListener('click', () => panel.remove());
    header.appendChild(close);

    return header;
};

const buildStats = (score, avg, length, hardPct) => {
    const color = scoreColor(score);
    const stats = el('div', 'stats');

    // — Score column —
    const scoreWrap = el('div', 'score-summary');
    [['score-value', String(score)], ['score-label', scoreLabel(score)]].forEach(([cls, str]) => {
        const node = elText('div', cls, str);
        node.style.color = color;
        scoreWrap.appendChild(node);
    });

    // — Meta rows —
    const meta = el('div', 'meta-info');
    const rows = [
        ['Avg cost / char', String(avg)],
        ['Characters',      length.toLocaleString()],
        ['Hard zones',      hardPct + '%'],
        ['Layout',          'ЙЦУКЕН'],
    ];
    for (const [key, val] of rows) {
        const row = el('div', 'meta-row');
        row.appendChild(elText('span', 'meta-key', key));
        const valNode = elText('span', 'meta-value', val);
        // Color avg and hard% to reinforce score tier
        if (key === 'Avg cost / char') valNode.style.color = color;
        if (key === 'Hard zones' && hardPct > 0) valNode.style.color = `var(--hard)`;
        row.appendChild(valNode);
        meta.appendChild(row);
    }

    stats.appendChild(scoreWrap);
    stats.appendChild(meta);
    return stats;
};

const buildBar = (score) => {
    const track = el('div', 'progress-track');
    const fill  = el('div', 'progress-fill');
    fill.style.width      = score + '%';
    fill.style.background = scoreColor(score);
    track.appendChild(fill);
    return track;
};

const buildLegend = () => {
    const legend = el('div', 'score-legend');
    for (const { cls, label } of SCORE_TIERS) {
        const item = elText('span', 'legend-item', label);
        const dot  = el('span', 'legend-dot');
        dot.style.background = `var(--${cls})`;
        item.prepend(dot);
        legend.appendChild(item);
    }
    return legend;
};

// Two-tone bar showing left/right hand key distribution
const buildHandBar = ({ left, right, imbalance }) => {
    const total    = left + right;
    const leftPct  = total > 0 ? Math.round(left  / total * 100) : 50;
    const rightPct = 100 - leftPct;

    const wrap  = el('div', 'hand-bar-wrap');
    const label = el('div', 'hand-bar-label');

    label.appendChild(elText('span', 'hand-label hand-l', `L ${leftPct}%`));

    // Imbalance badge — only shown when meaningfully lopsided
    if (imbalance > 0.15) {
        const badge = elText('span', 'hand-imbalance', imbalance > 0.4 ? '⚠ one-sided' : 'uneven');
        label.appendChild(badge);
    }

    label.appendChild(elText('span', 'hand-label hand-r', `${rightPct}% R`));
    wrap.appendChild(label);

    const track = el('div', 'hand-bar-track');
    const segL  = el('div', 'hand-seg hand-seg-l');
    const segR  = el('div', 'hand-seg hand-seg-r');
    segL.style.width = leftPct  + '%';
    segR.style.width = rightPct + '%';
    track.appendChild(segL);
    track.appendChild(segR);
    wrap.appendChild(track);

    return wrap;
};

// Row of top hardest characters
const buildTopChars = (topChars) => {
    const wrap = el('div', 'hotspot-section');
    wrap.appendChild(elText('div', 'hotspot-label', 'Hardest keys'));

    const list = el('div', 'hotspot-list');
    for (const { ch, cost } of topChars) {
        const chip = el('div', 'hotspot-chip');
        chip.appendChild(elText('span', 'hotspot-ch', ch));
        chip.appendChild(elText('span', 'hotspot-cost', cost));
        list.appendChild(chip);
    }

    wrap.appendChild(list);
    return wrap;
};

// Row of top hardest bigrams
const buildTopBigrams = (topBigrams) => {
    const wrap = el('div', 'hotspot-section');
    wrap.appendChild(elText('div', 'hotspot-label', 'Hardest bigrams'));

    const list = el('div', 'hotspot-list');
    for (const { pair, cost } of topBigrams) {
        const chip = el('div', 'hotspot-chip');
        chip.appendChild(elText('span', 'hotspot-ch', pair));
        chip.appendChild(elText('span', 'hotspot-cost', cost));
        list.appendChild(chip);
    }

    wrap.appendChild(list);
    return wrap;
};

const buildTextView = ({ chars, segments }) => {
    const scroll = el('div', 'text-scroll');
    const block  = el('div', 'text-block');

    for (const { level, start, end } of segments) {
        block.appendChild(elText('span', level, chars.slice(start, end + 1).join('')));
    }

    scroll.appendChild(block);
    return scroll;
};

// ─── Public: render(result) ───────────────────────────────────────────────────

export const render = (result) => {
    document.getElementById(ID)?.remove();

    const { score, avg, length, hardPct, topChars, topBigrams, handBalance } = result;

    const panel = el('div');
    panel.id = ID;
    applyInitialTheme(panel);

    panel.appendChild(buildHeader(panel));
    panel.appendChild(buildStats(score, avg, length, hardPct));
    panel.appendChild(buildBar(score));
    panel.appendChild(buildLegend());
    panel.appendChild(buildHandBar(handBalance));
    panel.appendChild(buildTopChars(topChars));
    panel.appendChild(buildTopBigrams(topBigrams));
    panel.appendChild(buildTextView(result));

    document.body.appendChild(panel);
    makeDraggable(panel, panel.querySelector('.panel-header'), 'complexityFilterPanelPosition');
};