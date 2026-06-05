// ─── ui.js ───────────────────────────────────────────────────────────────────
// Builds and injects the KG Complexity panel entirely via DOM API.
// No innerHTML anywhere.

import '../styles/styles.scss';
import { createIcon }                          from '../icons/iconsIndex';
import { makeDraggable }                       from '../helpers/drag';
import { applyInitialTheme, toggleTheme }      from '../helpers/theme';
import { applyInitialView, cycleView }         from '../helpers/view';
import { applyInitialLang, toggleLang,
         getStrings }                          from '../helpers/lang';

const ID = 'complexity-filter-panel';

// ─── DOM micro-helpers ────────────────────────────────────────────────────────

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

const appendAll = (parent, ...children) => {
    for (const child of children) if (child) parent.appendChild(child);
    return parent;
};

// ─── Score tiers ──────────────────────────────────────────────────────────────

const SCORE_TIER_KEYS = [
    { max: 35,       cls: 'easy',   key: 'tierEasy'   },
    { max: 65,       cls: 'medium', key: 'tierMedium' },
    { max: Infinity, cls: 'hard',   key: 'tierHard'   },
];

const scoreTier  = (s) => SCORE_TIER_KEYS.find(t => s < t.max);
const scoreColor = (s) => `var(--${scoreTier(s).cls})`;
const scoreLabel = (s, strings) => strings[scoreTier(s).key];

// ─── Penalty metadata ─────────────────────────────────────────────────────────

const PENALTY_META = [
    { key: 'sameFinger',  strKey: 'penaltySameFinger', color: 'var(--hard)'    },
    { key: 'outwardRoll', strKey: 'penaltyOutward',    color: 'var(--medium)'  },
    { key: 'scissor',     strKey: 'penaltyScissor',    color: 'var(--accent)'  },
    { key: 'rowJump',     strKey: 'penaltyRowJump',    color: 'var(--easy)'    },
    { key: 'shiftHold',   strKey: 'penaltyShift',      color: 'var(--hand-r)'  },
    { key: 'other',       strKey: 'penaltyOther',      color: 'var(--border)'  },
];

// ─── Section builders ─────────────────────────────────────────────────────────

const buildViewToggleBtn = (panel) => {
    const btn = el('button', 'panel-btn panel-view');
    btn.addEventListener('click', () => cycleView(panel));
    appendAll(btn,
        createIcon('eye-fill'),
        createIcon('eye-off-fill'),
        createIcon('eye-close-fill'),
    );
    return btn;
};

const buildThemeBtn = (panel) => {
    const btn = el('button', 'panel-btn panel-theme');
    btn.addEventListener('click', () => toggleTheme(panel));
    appendAll(btn, createIcon('sun-fill'), createIcon('moon-fill'));
    return btn;
};

// Language toggle — emoji flag showing the OTHER language.
const buildLangBtn = (panel, strings) => {
    const btn = elText('button', 'panel-btn panel-lang', strings.langIcon);
    btn.title = strings.langLabel;
    btn.addEventListener('click', () => {
        toggleLang(panel);
        // Re-render the whole panel in the new language.
        // We store the last result on the panel element to avoid a re-fetch.
        const result = panel._kgResult;
        if (result) render(result);
    });
    return btn;
};

const buildHeader = (panel, strings, layoutName) => {
    const header = el('div', 'panel-header');

    appendAll(header,
        elText('span', 'panel-logo',  'KG'),
        elText('span', 'panel-title', `${strings.title} · ${layoutName}`),
        buildViewToggleBtn(panel),
        buildThemeBtn(panel),
        buildLangBtn(panel, strings),
    );

    const close = el('button', 'panel-btn panel-close');
    close.title = strings.btnClose;
    close.appendChild(createIcon('close-line'));
    close.addEventListener('click', () => panel.remove());
    header.appendChild(close);

    return header;
};

const buildStats = (result, strings) => {
    const { score, avg, length, hardPct, longWordPct, digitRowPct, lang, layoutName } = result;
    const color = scoreColor(score);
    const stats = el('div', 'stats');

    // Score column
    const scoreWrap = el('div', 'score-summary');
    for (const [cls, str] of [['score-value', String(score)], ['score-label', scoreLabel(score, strings)]]) {
        const node = elText('div', cls, str);
        node.style.color = color;
        scoreWrap.appendChild(node);
    }

    const LANG_FLAG = { ru: '🇷🇺', en: '🇬🇧' };
    const flag = LANG_FLAG[lang] ?? '🌐';

    const meta = el('div', 'meta-info');
    const rows = [
        [strings.metaAvg,       String(avg),                   'avg'      ],
        [strings.metaChars,     length.toLocaleString(),        null       ],
        [strings.metaHardZones, hardPct + '%',                  'hard'     ],
        [strings.metaLongWords, longWordPct + '%',              'longword' ],
        [strings.metaLayout,    `${flag} ${layoutName}`,        null       ],
        ['#-row',               digitRowPct + '%',              'digitrow' ],
    ];

    for (const [key, val, hint] of rows) {
        const row = el('div', 'meta-row');
        row.appendChild(elText('span', 'meta-key', key));
        const valNode = elText('span', 'meta-value', val);
        if (hint === 'avg'      )                        valNode.style.color = color;
        if (hint === 'hard'     && hardPct     > 0)      valNode.style.color = 'var(--hard)';
        if (hint === 'longword' && longWordPct > 0)      valNode.style.color = 'var(--medium)';
        if (hint === 'digitrow' && digitRowPct > 10)     valNode.style.color = 'var(--medium)';
        row.appendChild(valNode);
        meta.appendChild(row);
    }

    appendAll(stats, scoreWrap, meta);
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

const buildLegend = (strings) => {
    const legend = el('div', 'score-legend');
    for (const { cls, key } of SCORE_TIER_KEYS) {
        const item = elText('span', 'legend-item', strings[key]);
        const dot  = el('span', 'legend-dot');
        dot.style.background = `var(--${cls})`;
        item.prepend(dot);
        legend.appendChild(item);
    }
    return legend;
};

const buildHandBar = ({ left, right, imbalance }, strings) => {
    const total    = left + right;
    const leftPct  = total > 0 ? Math.round(left / total * 100) : 50;
    const rightPct = 100 - leftPct;

    const wrap  = el('div', 'hand-bar-wrap');
    const label = el('div', 'hand-bar-label');

    label.appendChild(elText('span', 'hand-label hand-l', `L ${leftPct}%`));

    const imbalanceLabel =
        imbalance > 0.85 ? strings.handImbalanceHigh  :
        imbalance > 0.55 ? strings.handImbalanceMid   :
        imbalance > 0.30 ? strings.handImbalanceLow   :
        imbalance > 0.15 ? strings.handImbalanceMinor :
        null;

    if (imbalanceLabel) label.appendChild(elText('span', 'hand-imbalance', imbalanceLabel));

    label.appendChild(elText('span', 'hand-label hand-r', `${rightPct}% R`));
    wrap.appendChild(label);

    const track = el('div', 'hand-bar-track');
    const segL  = el('div', 'hand-seg hand-seg-l');
    const segR  = el('div', 'hand-seg hand-seg-r');
    segL.style.width = leftPct  + '%';
    segR.style.width = rightPct + '%';
    appendAll(track, segL, segR);
    wrap.appendChild(track);

    return wrap;
};

const buildPenaltyBreakdown = (pb, strings) => {
    if (!pb) return null;

    const wrap = el('div', 'penalty-wrap');
    wrap.appendChild(elText('div', 'hotspot-label', strings.penaltyLabel));

    const track = el('div', 'penalty-track');
    for (const { key, color } of PENALTY_META) {
        const pct = pb[key] ?? 0;
        if (pct === 0) continue;
        const seg = el('div', 'penalty-seg');
        seg.style.width      = pct + '%';
        seg.style.background = color;
        track.appendChild(seg);
    }
    wrap.appendChild(track);

    const legend = el('div', 'penalty-legend');
    for (const { key, strKey, color } of PENALTY_META) {
        const pct = pb[key] ?? 0;
        if (pct === 0) continue;
        const row = el('div', 'penalty-row');
        const dot = el('span', 'legend-dot');
        dot.style.background = color;
        appendAll(row,
            dot,
            elText('span', 'penalty-key', strings[strKey]),
            elText('span', 'penalty-pct', pct + '%'),
        );
        legend.appendChild(row);
    }
    wrap.appendChild(legend);

    return wrap;
};

const buildTopBigrams = (topBigrams, strings) => {
    const wrap = el('div', 'hotspot-section');
    wrap.appendChild(elText('div', 'hotspot-label', strings.hardestBigrams));

    const list = el('div', 'hotspot-list');
    for (const { pair, cost } of topBigrams) {
        const chip = el('div', 'hotspot-chip');
        appendAll(chip,
            elText('span', 'hotspot-ch', pair),
            elText('span', 'hotspot-cost', cost),
        );
        list.appendChild(chip);
    }

    wrap.appendChild(list);
    return wrap;
};

// Per-finger load bars
const buildFingerLoad = (fingerLoad, strings) => {
    const wrap = el('div', 'finger-load-wrap');
    wrap.appendChild(elText('div', 'hotspot-label', strings.fingerLoad));

    const bars = el('div', 'finger-load-bars');
    const max  = Math.max(...fingerLoad, 1);

    for (let i = 0; i < fingerLoad.length; i++) {
        const pct  = fingerLoad[i];
        const col  = i < 5 ? 'var(--hand-l)' : 'var(--hand-r)';
        const item = el('div', 'fl-item');

        const barWrap = el('div', 'fl-bar-wrap');
        const fill    = el('div', 'fl-bar-fill');
        fill.style.height     = Math.round(pct / max * 100) + '%';
        fill.style.background = col;
        fill.title            = strings.fingers[i] + ': ' + pct + '%';
        barWrap.appendChild(fill);

        appendAll(item,
            barWrap,
            elText('span', 'fl-label', strings.fingers[i]),
        );
        bars.appendChild(item);
    }

    wrap.appendChild(bars);
    return wrap;
};

// Top hardest words
const buildTopWords = (topWords, strings) => {
    if (!topWords?.length) return null;

    const wrap = el('div', 'hotspot-section');
    wrap.appendChild(elText('div', 'hotspot-label', strings.topWords));

    const list = el('div', 'hotspot-list');
    for (const { word, cost } of topWords) {
        const chip = el('div', 'hotspot-chip');
        appendAll(chip,
            elText('span', 'hotspot-ch', word),
            elText('span', 'hotspot-cost', cost),
        );
        list.appendChild(chip);
    }

    wrap.appendChild(list);
    return wrap;
};


const buildTextView = ({ chars, segments, longWordChars, worstZone }) => {
    const scroll = el('div', 'text-scroll');
    const block  = el('div', 'text-block');

    for (const seg of segments) {
        const { level, start, end } = seg;
        const isWorst = worstZone && seg === worstZone;

        let runStart = start;
        let runLong  = longWordChars?.has(start) ?? false;

        for (let k = start + 1; k <= end + 1; k++) {
            const isLong = k <= end && (longWordChars?.has(k) ?? false);
            if (k === end + 1 || isLong !== runLong) {
                const span = elText('span', level, chars.slice(runStart, k).join(''));
                if (runLong)  span.classList.add('long-word');
                if (isWorst)  span.classList.add('worst-zone');
                block.appendChild(span);
                runStart = k;
                runLong  = isLong;
            }
        }
    }

    scroll.appendChild(block);
    return scroll;
};

const TIER_COLOR = { easy: 'var(--easy)', medium: 'var(--medium)', hard: 'var(--hard)' };

const buildDifficultyBar = ({ chars, segments }) => {
    const total = chars.length || 1;
    const stops = [];

    for (const { level, start, end } of segments) {
        const color = TIER_COLOR[level] ?? 'var(--border)';
        const from  = (start / total * 100).toFixed(2) + '%';
        const to    = ((end + 1) / total * 100).toFixed(2) + '%';
        stops.push(`${color} ${from}`, `${color} ${to}`);
    }

    const bar = el('div', 'difficulty-bar');
    bar.style.background = `linear-gradient(to right, ${stops.join(', ')})`;
    return bar;
};

// ─── Score count-up animation ─────────────────────────────────────────────────

const animateScore = (node, target) => {
    const DURATION = 600;
    const start    = performance.now();
    const step     = (now) => {
        const t   = Math.min(1, (now - start) / DURATION);
        const val = Math.round(t * t * (3 - 2 * t) * target); // smooth-step easing
        node.textContent = String(val);
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
};

// ─── Public: render(result) ───────────────────────────────────────────────────

export const render = (result) => {
    document.getElementById(ID)?.remove();

    const strings = getStrings();
    const { score, topBigrams, penaltyBreakdown, handBalance,
            fingerLoad, topWords, layoutName } = result;

    const panel = el('div');
    panel.id = ID;
    panel._kgResult = result; // stored for language re-render

    applyInitialTheme(panel);
    applyInitialView(panel);
    applyInitialLang(panel);

    panel.appendChild(buildHeader(panel, strings, layoutName));
    panel.appendChild(buildDifficultyBar(result));

    const summary = el('div', 'panel-summary');
    appendAll(summary,
        buildStats(result, strings),
        buildBar(score),
        buildLegend(strings),
    );
    panel.appendChild(summary);

    const body = el('div', 'panel-body');
    appendAll(body,
        buildHandBar(handBalance, strings),
        buildPenaltyBreakdown(penaltyBreakdown, strings),
        buildFingerLoad(fingerLoad, strings),
        buildTopBigrams(topBigrams, strings),
        buildTopWords(topWords, strings),
        buildTextView(result),
    );
    panel.appendChild(body);

    document.body.appendChild(panel);
    makeDraggable(panel, panel.querySelector('.panel-header'), 'complexityFilterPanelPosition');

    // Count-up animation on the score value
    const scoreNode = panel.querySelector('.score-value');
    if (scoreNode) animateScore(scoreNode, score);
};