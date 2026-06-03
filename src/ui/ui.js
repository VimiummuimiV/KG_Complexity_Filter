// ─── ui.js ───────────────────────────────────────────────────────────────────
// Builds and injects the KG Complexity panel entirely via DOM API.
// No innerHTML anywhere.

const ID = 'kg-complexity-ui';

// ─── CSS (injected once as a <style> tag — content is a plain string, not DOM markup) ──
const CSS = `
#${ID} {
    --bg:        #0f1117;
    --border:    #2a2f42;
    --txt:       #d4d8e8;
    --txt-dim:   #6b728e;
    --accent:    #5b8cff;
    --easy:      #4caf82;
    --medium:    #f0b840;
    --hard:      #e05c5c;
    --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    --font-ui:   'Inter', 'Segoe UI', system-ui, sans-serif;

    position: fixed;
    bottom: 24px;
    right: 24px;
    width: clamp(320px, 38vw, 560px);
    max-height: 80vh;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 24px 64px rgba(0,0,0,.6), 0 0 0 1px rgba(91,140,255,.08);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 99999;
    font-family: var(--font-ui);
    font-size: 13px;
    color: var(--txt);
    opacity: 0;
    transform: translateY(12px);
    animation: kg-in .35s cubic-bezier(.16,1,.3,1) forwards;
}
@keyframes kg-in { to { opacity:1; transform:translateY(0); } }

#${ID} .kg-header {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 16px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}
#${ID} .kg-logo {
    font-size: 10px; font-weight: 700;
    letter-spacing: .12em; text-transform: uppercase;
    color: var(--accent); opacity: .85;
}
#${ID} .kg-title { font-size: 12px; color: var(--txt-dim); flex: 1; }
#${ID} .kg-close {
    background: none; border: none; color: var(--txt-dim);
    cursor: pointer; font-size: 16px; line-height: 1;
    padding: 2px 4px; border-radius: 4px;
    transition: color .15s, background .15s;
}
#${ID} .kg-close:hover { color: var(--txt); background: var(--border); }

#${ID} .kg-stats {
    display: flex; align-items: stretch;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}
#${ID} .kg-score-wrap {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding-right: 20px;
    border-right: 1px solid var(--border);
    margin-right: 20px;
    min-width: 80px;
}
#${ID} .kg-score-num {
    font-size: 38px; font-weight: 700; line-height: 1;
    font-variant-numeric: tabular-nums; letter-spacing: -.02em;
}
#${ID} .kg-score-label {
    font-size: 10px; text-transform: uppercase;
    letter-spacing: .1em; color: var(--txt-dim); margin-top: 4px;
}
#${ID} .kg-meta {
    display: flex; flex-direction: column;
    gap: 6px; justify-content: center; flex: 1;
}
#${ID} .kg-meta-row { display: flex; justify-content: space-between; font-size: 12px; }
#${ID} .kg-meta-key { color: var(--txt-dim); }
#${ID} .kg-meta-val { font-family: var(--font-mono); color: var(--txt); }

#${ID} .kg-bar-track {
    height: 5px; background: var(--border);
    border-radius: 99px; overflow: hidden;
    margin: 0 16px 14px; flex-shrink: 0;
}
#${ID} .kg-bar-fill {
    height: 100%; border-radius: 99px;
    transition: width .6s cubic-bezier(.16,1,.3,1);
}

#${ID} .kg-legend {
    display: flex; gap: 14px;
    padding: 0 16px 12px; flex-shrink: 0;
}
#${ID} .kg-leg { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--txt-dim); }
#${ID} .kg-leg-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

#${ID} .kg-text-scroll {
    overflow-y: auto; padding: 14px 16px 18px;
    flex: 1; min-height: 0;
}
#${ID} .kg-text-scroll::-webkit-scrollbar { width: 5px; }
#${ID} .kg-text-scroll::-webkit-scrollbar-track { background: transparent; }
#${ID} .kg-text-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
#${ID} .kg-text {
    font-family: var(--font-mono); font-size: 12.5px;
    line-height: 1.75; word-break: break-word; white-space: pre-wrap;
}
#${ID} .kg-text .easy   { color: var(--easy); }
#${ID} .kg-text .medium { color: var(--medium); }
#${ID} .kg-text .hard   { color: var(--hard); background: rgba(224,92,92,.08); border-radius: 2px; }
`;

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

const el = (tag, cls) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
};

const txt = (str) => document.createTextNode(str);

const scoreColor = (s) => s < 35 ? 'var(--easy)' : s < 65 ? 'var(--medium)' : 'var(--hard)';
const scoreLabel = (s) => s < 35 ? 'Easy'         : s < 65 ? 'Moderate'       : 'Hard';

// ─── Style injection (once) ───────────────────────────────────────────────────

let styleInjected = false;
const injectStyle = () => {
    if (styleInjected) return;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    styleInjected = true;
};

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
    injectStyle();
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