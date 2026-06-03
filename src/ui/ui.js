// ─── ui.js ───────────────────────────────────────────────────────────────────
// Builds and injects the KG Complexity panel entirely via DOM API.
// No innerHTML anywhere.

import '../styles/styles.scss';

const ID = 'kg-complexity-ui';

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

const buildHeader = (panel) => {
    const header = el('div', 'kg-header');

    const logo = el('span', 'kg-logo');
    logo.appendChild(txt('KG'));

    const title = el('span', 'kg-title');
    title.appendChild(txt('Typing Complexity · ЙЦУКЕН'));

    const close = el('button', 'kg-close');
    close.title = 'Close';
    close.appendChild(txt('✕'));
    close.addEventListener('click', () => panel.remove());

    header.appendChild(logo);
    header.appendChild(title);
    header.appendChild(close);
    return header;
};

const buildStats = (score, avg, length) => {
    const color = scoreColor(score);
    const label = scoreLabel(score);

    const stats = el('div', 'kg-stats');

    // — Score column —
    const scoreWrap = el('div', 'kg-score-wrap');

    const scoreNum = el('div', 'kg-score-num');
    scoreNum.style.color = color;
    scoreNum.appendChild(txt(String(score)));

    const scoreLabel_ = el('div', 'kg-score-label');
    scoreLabel_.style.color = color;
    scoreLabel_.appendChild(txt(label));

    scoreWrap.appendChild(scoreNum);
    scoreWrap.appendChild(scoreLabel_);

    // — Meta rows —
    const meta = el('div', 'kg-meta');

    const rows = [
        ['Avg cost / char', String(avg)],
        ['Characters',      length.toLocaleString()],
        ['Layout',          'ЙЦУКЕН'],
    ];

    for (const [key, val] of rows) {
        const row = el('div', 'kg-meta-row');

        const keySpan = el('span', 'kg-meta-key');
        keySpan.appendChild(txt(key));

        const valSpan = el('span', 'kg-meta-val');
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
    const track = el('div', 'kg-bar-track');
    const fill  = el('div', 'kg-bar-fill');
    fill.style.width      = score + '%';
    fill.style.background = scoreColor(score);
    track.appendChild(fill);
    return track;
};

const buildLegend = () => {
    const legend = el('div', 'kg-legend');
    const items  = [['easy', 'Easy'], ['medium', 'Moderate'], ['hard', 'Hard']];

    for (const [cls, label] of items) {
        const leg = el('span', 'kg-leg');

        const dot = el('span', 'kg-leg-dot');
        dot.style.background = `var(--${cls})`;

        leg.appendChild(dot);
        leg.appendChild(txt(label));
        legend.appendChild(leg);
    }
    return legend;
};

const buildTextView = ({ chars, segments }) => {
    const scroll = el('div', 'kg-text-scroll');
    const block  = el('div', 'kg-text');

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