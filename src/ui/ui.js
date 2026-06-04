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

const buildHeader = (panel, layoutName) => {
    const header = el('div', 'panel-header');

    header.appendChild(elText('span', 'panel-logo',  'KG'));
    header.appendChild(elText('span', 'panel-title', `Typing Complexity · ${layoutName}`));
    header.appendChild(buildThemeBtn(panel));

    const close = el('button', 'panel-btn panel-close');
    close.title = 'Close';
    close.appendChild(createIcon('close-line'));
    close.addEventListener('click', () => panel.remove());
    header.appendChild(close);

    return header;
};

const buildStats = (score, avg, length, hardPct, lang, layoutName) => {
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
    const LANG_FLAG = { ru: '🇷🇺', en: '🇬🇧' };
    const flag = LANG_FLAG[lang] ?? '🌐';

    const meta = el('div', 'meta-info');
    const rows = [
        ['Avg cost / char', String(avg)],
        ['Characters',      length.toLocaleString()],
        ['Hard zones',      hardPct + '%'],
        ['Layout',          `${flag} ${layoutName}`],
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

    // Imbalance badge — severity scales with actual imbalance
    // 0.00–0.15 → hidden (balanced)
    // 0.15–0.30 → uneven
    // 0.30–0.55 → ⚠ lopsided
    // 0.55–0.85 → ⚠ dominant hand
    // 0.85–1.00 → ⚠ one-sided
    const imbalanceLabel = imbalance > 0.85 ? '⚠ one-sided'
                         : imbalance > 0.55 ? '⚠ dominant hand'
                         : imbalance > 0.30 ? '⚠ lopsided'
                         : imbalance > 0.15 ? 'uneven'
                         : null;
    if (imbalanceLabel) {
        label.appendChild(elText('span', 'hand-imbalance', imbalanceLabel));
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

// Segmented bar + legend showing what % of typing cost comes from each penalty type
const PENALTY_META = [
    { key: 'sameFinger',  label: 'Same finger',  color: 'var(--hard)'    },
    { key: 'outwardRoll', label: 'Outward roll',  color: 'var(--medium)'  },
    { key: 'scissor',     label: 'Scissor',       color: 'var(--accent)'  },
    { key: 'rowJump',     label: 'Row jump',      color: 'var(--easy)'    },
    { key: 'shiftHold',   label: 'Shift hold',    color: 'var(--hand-r)'  },
    { key: 'other',       label: 'Base cost',     color: 'var(--border)'  },
];

const buildPenaltyBreakdown = (pb) => {
    if (!pb) return null;

    const wrap = el('div', 'penalty-wrap');
    wrap.appendChild(elText('div', 'hotspot-label', 'Penalty breakdown'));

    // Segmented bar
    const track = el('div', 'penalty-track');
    for (const { key, color } of PENALTY_META) {
        const pct = pb[key] ?? 0;
        if (pct === 0) continue;
        const seg = el('div', 'penalty-seg');
        seg.style.width      = pct + '%';
        seg.style.background = color;
        seg.title            = `${PENALTY_META.find(m => m.key === key).label}: ${pct}%`;
        track.appendChild(seg);
    }
    wrap.appendChild(track);

    // Legend rows — only show buckets that have a non-zero share
    const legend = el('div', 'penalty-legend');
    for (const { key, label, color } of PENALTY_META) {
        const pct = pb[key] ?? 0;
        if (pct === 0) continue;
        const row = el('div', 'penalty-row');
        const dot = el('span', 'legend-dot');
        dot.style.background = color;
        row.appendChild(dot);
        row.appendChild(elText('span', 'penalty-key', label));
        row.appendChild(elText('span', 'penalty-pct', pct + '%'));
        legend.appendChild(row);
    }
    wrap.appendChild(legend);

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

    const { score, avg, length, hardPct, topBigrams, penaltyBreakdown, handBalance, lang, layoutName } = result;

    const panel = el('div');
    panel.id = ID;
    applyInitialTheme(panel);

    panel.appendChild(buildHeader(panel, layoutName));
    panel.appendChild(buildStats(score, avg, length, hardPct, lang, layoutName));
    panel.appendChild(buildBar(score));
    panel.appendChild(buildLegend());
    panel.appendChild(buildHandBar(handBalance));
    const breakdown = buildPenaltyBreakdown(penaltyBreakdown);
    if (breakdown) panel.appendChild(breakdown);
    panel.appendChild(buildTopBigrams(topBigrams));
    panel.appendChild(buildTextView(result));

    document.body.appendChild(panel);
    makeDraggable(panel, panel.querySelector('.panel-header'), 'complexityFilterPanelPosition');
};