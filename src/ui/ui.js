// ─── ui.js ───────────────────────────────────────────────────────────────────
// Builds and injects the KG Complexity panel entirely via DOM API.
// No innerHTML anywhere.

import '../styles/styles.scss';
import { icons } from '../icons';

const ID = 'complexity-panel';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

const el = (tag, cls) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
};

const txt = (str) => document.createTextNode(str);

const scoreColor = (s) => s < 35 ? 'var(--easy)' : s < 65 ? 'var(--medium)' : 'var(--hard)';
const scoreLabel = (s) => s < 35 ? 'Easy'         : s < 65 ? 'Moderate'       : 'Hard';

// ─── Section builders ─────────────────────────────────────────────────────────

const parseSvg = (svgString) =>
    new DOMParser().parseFromString(svgString, 'image/svg+xml').documentElement;

const createIcon = (name, attrs = {}) => {
    const svgString = icons[name];
    if (!svgString) {
        throw new Error(`Icon not found: ${name}`);
    }

    const svg = parseSvg(svgString);
    svg.classList.add('panel-icon');

    if (attrs.class) {
        svg.classList.add(...attrs.class.split(/\s+/).filter(Boolean));
        delete attrs.class;
    }

    Object.entries(attrs).forEach(([key, value]) => svg.setAttribute(key, value));
    return svg;
};

const buildHeader = (panel) => {
    const header = el('div', 'panel-header');

    const logo = el('span', 'panel-logo');
    logo.appendChild(txt('KG'));

    const title = el('span', 'panel-title');
    title.appendChild(txt('Typing Complexity · ЙЦУКЕН'));

    const close = el('button', 'panel-close');
    close.title = 'Close';
    close.appendChild(createIcon('close-line'));
    close.addEventListener('click', () => panel.remove());

    header.appendChild(logo);
    header.appendChild(title);
    header.appendChild(close);
    return header;
};

const buildStats = (score, avg, length) => {
    const color = scoreColor(score);
    const label = scoreLabel(score);

    const stats = el('div', 'stats');

    // — Score column —
    const scoreWrap = el('div', 'score-summary');

    const scoreNum = el('div', 'score-value');
    scoreNum.style.color = color;
    scoreNum.appendChild(txt(String(score)));

    const scoreLabel_ = el('div', 'score-label');
    scoreLabel_.style.color = color;
    scoreLabel_.appendChild(txt(label));

    scoreWrap.appendChild(scoreNum);
    scoreWrap.appendChild(scoreLabel_);

    // — Meta rows —
    const meta = el('div', 'meta-info');

    const rows = [
        ['Avg cost / char', String(avg)],
        ['Characters',      length.toLocaleString()],
        ['Layout',          'ЙЦУКЕН'],
    ];

    for (const [key, val] of rows) {
        const row = el('div', 'meta-row');

        const keySpan = el('span', 'meta-key');
        keySpan.appendChild(txt(key));

        const valSpan = el('span', 'meta-value');
        valSpan.appendChild(txt(val));

        row.appendChild(keySpan);
        row.appendChild(valSpan);
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
    const items  = [['easy', 'Easy'], ['medium', 'Moderate'], ['hard', 'Hard']];

    for (const [cls, label] of items) {
        const leg = el('span', 'legend-item');

        const dot = el('span', 'legend-dot');
        dot.style.background = `var(--${cls})`;

        leg.appendChild(dot);
        leg.appendChild(txt(label));
        legend.appendChild(leg);
    }
    return legend;
};

const buildTextView = ({ chars, segments }) => {
    const scroll = el('div', 'text-scroll');
    const block  = el('div', 'text-block');

    for (const seg of segments) {
        const span = el('span', seg.level);
        span.appendChild(txt(chars.slice(seg.start, seg.end + 1).join('')));
        block.appendChild(span);
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
};