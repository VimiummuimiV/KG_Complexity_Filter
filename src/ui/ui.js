// ─── ui.js ───────────────────────────────────────────────────────────────────
// Builds and injects the KG Complexity panel entirely via DOM API.
// No innerHTML anywhere.

import '../styles/styles.scss';
import { createIcon } from '../icons';
import { makeDraggable } from '../helpers/drag';

const ID = 'complexity-filter-panel';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

const el = (tag, cls) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
};

// Create an element with a text node in one call
const elText = (tag, cls, str) => {
  const node = el(tag, cls);
  node.appendChild(document.createTextNode(str));
  return node;
};

const SCORE_TIERS = [
  { max: 35, cls: 'easy',   label: 'Easy'     },
  { max: 65, cls: 'medium', label: 'Moderate' },
  { max: Infinity, cls: 'hard', label: 'Hard' },
];

const scoreTier  = (s) => SCORE_TIERS.find(t => s < t.max);
const scoreColor = (s) => `var(--${scoreTier(s).cls})`;
const scoreLabel = (s) => scoreTier(s).label;

// ─── Section builders ─────────────────────────────────────────────────────────

const buildHeader = (panel) => {
    const header = el('div', 'panel-header');

    header.appendChild(elText('span', 'panel-logo',  'KG'));
    header.appendChild(elText('span', 'panel-title', 'Typing Complexity · ЙЦУКЕН'));

    const close = el('button', 'panel-close');
    close.title = 'Close';
    close.appendChild(createIcon('close-line'));
    close.addEventListener('click', () => panel.remove());
    header.appendChild(close);

    return header;
};

const buildStats = (score, avg, length) => {
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
        ['Layout',          'ЙЦУКЕН'],
    ];
    for (const [key, val] of rows) {
        const row = el('div', 'meta-row');
        row.appendChild(elText('span', 'meta-key',   key));
        row.appendChild(elText('span', 'meta-value', val));
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

    const { score, avg, length } = result;

    const panel = el('div');
    panel.id = ID;

    panel.appendChild(buildHeader(panel));
    panel.appendChild(buildStats(score, avg, length));
    panel.appendChild(buildBar(score));
    panel.appendChild(buildLegend());
    panel.appendChild(buildTextView(result));

    document.body.appendChild(panel);
    makeDraggable(panel, panel.querySelector('.panel-header'), 'complexityFilterPanelPosition');
};