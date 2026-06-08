// ─── ui.js ───────────────────────────────────────────────────────────────────
// Builds and injects the KG Complexity panel entirely via DOM API.
// No innerHTML anywhere.

import '../styles/styles.scss';
import { createIcon }                          from '../icons/iconsIndex';
import { makeDraggable, constrain }            from '../helpers/drag';
import { applyInitialTheme, toggleTheme }      from '../helpers/theme';
import { applyInitialView, cycleView }         from '../helpers/view';
import { applyInitialLang, toggleLang,
         getStrings }                          from '../helpers/lang';
import { createCustomTooltip, updateTooltipContent } from '../helpers/tooltip';
import { applyInitialSections, toggleSection, collapseAllExcept, toggleAllSections } from '../helpers/sections';
import { openKeyboard, updateKeyboard, closeKeyboard } from './keyboard';

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

// ─── Collapsible section wrapper ──────────────────────────────────────────────

const buildSection = (key, label, ...children) => {
    const valid = children.filter(Boolean);
    if (!valid.length) return null;

    const wrap   = el('div', 'section-wrap');
    wrap.dataset.section = key;

    const header = elText('div', 'section-header hotspot-label', label);
    header.addEventListener('click', (e) => {
        const panel = header.closest(`#${ID}`);
        if (e.altKey)       toggleAllSections(panel);
        else if (e.ctrlKey) collapseAllExcept(panel, key);
        else                toggleSection(panel, key);
    });
    header.addEventListener('mouseenter', () => {
        const collapsed = wrap.hasAttribute('data-collapsed');
        const strings   = getStrings();
        const click     = strings.tooltipClick;
        const hints     = [
            [click,             collapsed ? strings.tooltipSectionExpand : strings.tooltipSectionCollapse],
            [`Ctrl + ${click}`, collapsed ? strings.tooltipSectionSolo  : null],
            [`Alt + ${click}`,  strings.tooltipSectionToggleAll],
        ];
        updateTooltipContent(header, hints.filter(([, a]) => a).map(([m, a]) => `[${m}]${a}`).join(' '));
    });
    createCustomTooltip(header, '', 'stats', 200);
    wrap.appendChild(header);

    for (const child of valid) wrap.appendChild(child);
    return wrap;
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
    { key: 'sameFinger',  strKey: 'penaltySameFinger', color: 'var(--penalty-same-finger)' },
    { key: 'outwardRoll', strKey: 'penaltyOutward',    color: 'var(--penalty-outward)'     },
    { key: 'scissor',     strKey: 'penaltyScissor',    color: 'var(--penalty-scissor)'     },
    { key: 'rowJump',     strKey: 'penaltyRowJump',    color: 'var(--penalty-row-jump)'    },
    { key: 'shiftHold',   strKey: 'penaltyShift',      color: 'var(--penalty-shift)'       },
    { key: 'other',       strKey: 'penaltyOther',      color: 'var(--penalty-other)'       },
];

// ─── Section builders ─────────────────────────────────────────────────────────

const buildViewToggleBtn = (panel, strings) => {
    const btn = el('button', 'panel-btn panel-view');
    btn.addEventListener('click', () => { cycleView(panel); constrain(panel); });
    appendAll(btn,
        createIcon('eye-fill'),
        createIcon('eye-off-fill'),
        createIcon('eye-close-fill'),
    );
    createCustomTooltip(btn, strings.btnCycleView, 'stats', 0);
    return btn;
};

const buildThemeBtn = (panel, strings) => {
    const btn = el('button', 'panel-btn panel-theme');
    btn.addEventListener('click', () => {
        toggleTheme(panel);
        updateKeyboard(panel);
    });
    appendAll(btn, createIcon('sun-fill'), createIcon('moon-fill'));
    createCustomTooltip(btn, strings.btnToggleTheme, 'stats', 0);
    return btn;
};

// Language toggle — flag icon showing the OTHER language.
const buildLangBtn = (panel, strings) => {
    const btn = el('button', 'panel-btn panel-lang');
    appendAll(btn, createIcon('ruFlag'), createIcon('enFlag'));
    createCustomTooltip(btn, strings.langLabel, 'stats', 0);
    btn.addEventListener('click', () => {
        toggleLang(panel);
        const { _kgResult, _kgVocId, _kgOnLang, _kgOnLayout } = panel;
        if (_kgResult) render(_kgResult, _kgVocId, _kgOnLang, _kgOnLayout);
    });
    return btn;
};

const buildHeader = (panel, strings, score) => {
    const header = el('div', 'panel-header');

    const miniScore = makeScoreNode('header-score');
    miniScore.style.color = scoreColor(score);

    appendAll(header,
        elText('span', 'panel-logo',  'KG'),
        elText('span', 'panel-title', strings.title),
        miniScore,
        buildViewToggleBtn(panel, strings),
        buildThemeBtn(panel, strings),
        buildLangBtn(panel, strings),
    );

    const close = el('button', 'panel-btn panel-close');
    close.appendChild(createIcon('close-line'));
    close.addEventListener('click', () => {
        closeKeyboard();
        panel.remove();
    });
    createCustomTooltip(close, strings.btnClose, 'stats', 0);
    header.appendChild(close);

    return { header, miniScore };
};

const buildStats = (panel, result, strings, onLangChange, onLayoutChange) => {
    const { score, avg, length, hardPct, longWordPct, digitRowPct, layoutLang, layoutName } = result;
    const color = scoreColor(score);
    const stats = el('div', 'stats');

    // Score column
    const scoreWrap = el('div', 'score-summary');
    for (const [cls, str] of [['score-value', String(score)], ['score-label', scoreLabel(score, strings)]]) {
        const node = elText('div', cls, str);
        node.style.color = color;
        scoreWrap.appendChild(node);
    }

    const LANG_ICON = { RU: 'ruFlag', EN: 'enFlag' };

    const meta = el('div', 'meta-info');
    const rows = [
        [strings.metaAvg,       String(avg),               'avg',      strings.tooltipAvg       ],
        [strings.metaChars,     length.toLocaleString(),    null,      strings.tooltipChars     ],
        [strings.metaHardZones, hardPct + '%',             'hard',     strings.tooltipHardZones ],
        [strings.metaLongWords, longWordPct + '%',         'longword', strings.tooltipLongWords ],
        [strings.metaLayout,    layoutName,                'layout',   null                     ],
        [strings.metaDigitRow,  digitRowPct + '%',         'digitrow', strings.tooltipDigitRow  ],
    ];

    for (const [key, val, hint, tip] of rows) {
        const row = el('div', 'meta-row');
        row.appendChild(elText('span', 'meta-key', key));
        const valNode = elText('span', 'meta-value', val);
        if (hint === 'avg'      )                        valNode.style.color = color;
        if (hint === 'hard'     && hardPct     > 0)      valNode.style.color = 'var(--hard)';
        if (hint === 'longword' && longWordPct > 0)      valNode.style.color = 'var(--medium)';
        if (hint === 'digitrow' && digitRowPct > 10)     valNode.style.color = 'var(--medium)';
        if (hint === 'layout') {
            const iconName = LANG_ICON[layoutLang];
            if (iconName) valNode.prepend(createIcon(iconName));
            if (onLangChange || onLayoutChange) {
                valNode.classList.add('meta-value-btn');
                valNode.addEventListener('click', (e) => {
                    if (e.shiftKey) { openKeyboard(panel, layoutLang, layoutName); return; }
                    if (e.ctrlKey)  onLayoutChange?.(layoutLang, layoutName);
                    else            onLangChange?.(layoutLang, layoutName);
                });
                valNode.addEventListener('mouseenter', () => {
                    const strings = getStrings();
                    const hints = [
                        `[${layoutLang} | ${layoutName}]`,
                        `[${strings.tooltipClick}]${strings.tooltipLang}`,
                        onLayoutChange ? `[Ctrl + ${strings.tooltipClick}]${strings.tooltipLayout}` : null,
                        `[Shift + ${strings.tooltipClick}]${strings.tooltipShowKeyboard}`,
                    ];
                    updateTooltipContent(valNode, hints.filter(Boolean).join(' '));
                });
                createCustomTooltip(valNode, '', 'stats', 0);
            }
        }
        row.appendChild(valNode);
        if (tip) createCustomTooltip(row, tip, 'stats', 0);
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
    const labelL = elText('span', 'hand-label hand-l', `L ${leftPct}%`);
    const labelR = elText('span', 'hand-label hand-r', `${rightPct}% R`);

    const imbalanceLabel =
        imbalance > 0.85 ? strings.handImbalanceHigh  :
        imbalance > 0.55 ? strings.handImbalanceMid   :
        imbalance > 0.30 ? strings.handImbalanceLow   :
        imbalance > 0.15 ? strings.handImbalanceMinor :
        null;

    label.appendChild(labelL);
    if (imbalanceLabel) label.appendChild(elText('span', 'hand-imbalance', imbalanceLabel));
    label.appendChild(labelR);
    wrap.appendChild(label);

    const track = el('div', 'hand-bar-track');
    const segL  = el('div', 'hand-seg hand-seg-l');
    const segR  = el('div', 'hand-seg hand-seg-r');
    segL.style.width = leftPct  + '%';
    segR.style.width = rightPct + '%';
    createCustomTooltip(segL, strings.tooltipHandL, 'stats', 0);
    createCustomTooltip(segR, strings.tooltipHandR, 'stats', 0);

    const panel = () => track.closest('#complexity-filter-panel');
    track.addEventListener('mousemove', (e) => {
        panel().dataset.activeHand = e.offsetX / track.offsetWidth < leftPct / 100 ? 'L' : 'R';
    });
    track.addEventListener('mouseleave', () => { delete panel().dataset.activeHand; });

    appendAll(track, segL, segR);
    wrap.appendChild(track);

    return wrap;
};

const buildPenaltyBreakdown = (pb, strings) => {
    if (!pb) return null;

    const wrap = el('div', 'penalty-wrap');

    const track = el('div', 'penalty-track');
    for (const { key, color } of PENALTY_META) {
        const { pct = 0 } = pb[key] ?? {};
        if (pct === 0) continue;
        const seg = el('div', 'penalty-seg');
        seg.style.width      = pct + '%';
        seg.style.background = color;
        track.appendChild(seg);
    }
    wrap.appendChild(track);

    const legend = el('div', 'penalty-legend');
    for (const { key, strKey, color } of PENALTY_META) {
        const { pct = 0, count } = pb[key] ?? {};
        if (pct === 0) continue;
        const row = el('div', 'penalty-row');
        const dot = el('span', 'legend-dot');
        dot.style.background = color;
        const pctNode = elText('span', 'penalty-pct', pct + '%');
        pctNode.style.color = color;
        const countNode = count != null && count > 0
            ? elText('span', 'penalty-count', count)
            : null;
        appendAll(row,
            dot,
            pctNode,
            countNode,
            elText('span', 'penalty-key', strings[strKey]),
        );
        const tipKey = 'tooltipPenalty_' + key;
        if (strings[tipKey]) createCustomTooltip(row, strings[tipKey], 'stats', 0);
        const panel = () => row.closest('#complexity-filter-panel');
        row.addEventListener('mouseenter', () => { panel().dataset.activePenalty = key; });
        row.addEventListener('mouseleave', () => { delete panel().dataset.activePenalty; });
        legend.appendChild(row);
    }
    wrap.appendChild(legend);

    return wrap;
};

const buildHardestBigrams = (hardestBigrams, strings) => {
    if (!hardestBigrams?.length) return null;

    const wrap = el('div', 'hotspot-section');

    const list = el('div', 'hotspot-list');
    for (const { pair, cost } of hardestBigrams) {
        const chip = el('div', 'hotspot-chip');
        appendAll(chip,
            elText('span', 'hotspot-ch', pair),
            elText('span', 'hotspot-cost', cost),
        );
        createCustomTooltip(chip, strings.tooltipBigram, 'stats', 0);
        list.appendChild(chip);
    }

    wrap.appendChild(list);
    return wrap;
};

// Per-finger load bars
const buildFingerLoad = (fingerLoad, strings) => {
    const wrap = el('div', 'finger-load-wrap');

    const bars = el('div', 'finger-load-bars');
    const max  = Math.max(...fingerLoad, 1);

    for (let i = 0; i < fingerLoad.length; i++) {
        const pct  = fingerLoad[i];
        const col  = i < 5 ? 'var(--hand-l)' : 'var(--hand-r)';
        const item = el('div', 'fl-item');

        const barWrap = el('div', 'fl-bar-wrap');
        barWrap.dataset.finger = i;
        barWrap.addEventListener('mouseenter', () => {
            bars.classList.add('fl-active');
            bars.dataset.activeFinger = i;
            barWrap.closest('#complexity-filter-panel').dataset.activeFinger = i;
        });
        barWrap.addEventListener('mouseleave', () => {
            bars.classList.remove('fl-active');
            delete bars.dataset.activeFinger;
            delete barWrap.closest('#complexity-filter-panel').dataset.activeFinger;
        });

        const fill = el('div', 'fl-bar-fill');
        fill.style.height     = Math.round(pct / max * 100) + '%';
        fill.style.background = col;
        barWrap.appendChild(fill);
        createCustomTooltip(barWrap, strings.fingers[i] + ': ' + pct + '%', 'stats', 0);

        appendAll(item,
            barWrap,
            elText('span', 'fl-label', strings.fingers[i]),
        );
        bars.appendChild(item);
    }

    wrap.appendChild(bars);
    return wrap;
};

// Hardest words
const buildHardestWords = (hardestWords, strings) => {
    if (!hardestWords?.length) return null;

    const wrap = el('div', 'hotspot-section');

    const list = el('div', 'hotspot-list');
    for (const { word, cost } of hardestWords) {
        const chip = el('div', 'hotspot-chip');
        appendAll(chip,
            elText('span', 'hotspot-ch', word),
            elText('span', 'hotspot-cost', cost),
        );
        createCustomTooltip(chip, strings.tooltipTopWord, 'stats', 0);
        list.appendChild(chip);
    }

    wrap.appendChild(list);
    return wrap;
};

const buildTextView = ({ chars, segments, longWordChars, worstZone,
                         sameFingerChars, shiftedChars, charFingers,
                         outwardRollChars, scissorChars, rowJumpChars }, strings) => {
    const text = el('div', 'panel-text');

    // Map penalty key → per-char Set for fast lookup when stamping spans
    const penaltyChars = {
        sameFinger:  sameFingerChars, // Map — test with .has()
        shiftHold:   shiftedChars,
        outwardRoll: outwardRollChars,
        scissor:     scissorChars,
        rowJump:     rowJumpChars,
    };
    const PENALTY_KEYS = ['sameFinger', 'shiftHold', 'outwardRoll', 'scissor', 'rowJump'];

    // Bitmask of per-char annotation flags — used to split runs when any flag changes.
    // Bits: 1=same-finger-L, 2=same-finger-R, 4=shifted, 8=outwardRoll, 16=scissor, 32=rowJump
    const flagOf = (k) => {
        const sameFingerHand = sameFingerChars?.get(k);
        return (sameFingerHand === 'L' ? 1 : sameFingerHand === 'R' ? 2 : 0) |
               (shiftedChars?.has(k)     ?  4 : 0) |
               (outwardRollChars?.has(k) ?  8 : 0) |
               (scissorChars?.has(k)     ? 16 : 0) |
               (rowJumpChars?.has(k)     ? 32 : 0);
    };

    for (const seg of segments) {
        const { level, start, end } = seg;
        const isWorst = worstZone && seg === worstZone;

        let runStart  = start;
        let runLong   = longWordChars?.has(start) ?? false;
        let runFlags  = flagOf(start);
        let runFinger = charFingers?.[start] ?? -1;

        for (let k = start + 1; k <= end + 1; k++) {
            const isLong = k <= end && (longWordChars?.has(k) ?? false);
            const flags  = k <= end ? flagOf(k) : -1;
            const finger = k <= end ? (charFingers?.[k] ?? -1) : -2;

            if (k === end + 1 || isLong !== runLong || flags !== runFlags || finger !== runFinger) {
                const span = elText('span', level, chars.slice(runStart, k).join(''));

                if (runLong)        span.classList.add('long-word');
                if (isWorst)        span.classList.add('worst-zone');
                if (runFlags & 1)   span.classList.add('same-finger-l');
                if (runFlags & 2)   span.classList.add('same-finger-r');
                if (runFlags & 4)   span.classList.add('shifted-char');
                if (runFinger >= 0) {
                    span.dataset.finger = runFinger;
                    span.dataset.hand   = runFinger < 5 ? 'L' : 'R';
                }

                const penalties = PENALTY_KEYS.filter(pk => penaltyChars[pk]?.has(runStart));
                if (!penalties.length && runFinger >= 0) penalties.push('other');
                span.dataset.penalty = penalties.join(' ');

                const tooltipText =
                    runLong ? strings.tooltipLongWordText :
                    isWorst ? strings.tooltipWorstZone :
                    (runFlags & 1) ? strings.tooltipSameFingerL :
                    (runFlags & 2) ? strings.tooltipSameFingerR :
                    ({
                        hard: strings.tooltipHardText,
                        medium: strings.tooltipMediumText,
                        easy: strings.tooltipEasyText,
                    })[level];

                if (tooltipText && !(runFlags & 4)) {
                    createCustomTooltip(span, tooltipText, 'stats', 0);
                }

                text.appendChild(span);
                runStart  = k;
                runLong   = isLong;
                runFlags  = flags;
                runFinger = finger;
            }
        }
    }

    return text;
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

// ─── Score node factory (shared by header mini-score and main score) ──────────

const makeScoreNode = (cls) => el('div', cls);

// ─── Score count-up animation ─────────────────────────────────────────────────
// Each digit position animates independently from 0 to its final digit,
// so tens and units both travel exactly once through their own range.

const animateScore = (node, target) => {
    const DURATION = 600;
    const start    = performance.now();
    const digits   = String(target).split('');   // e.g. ['7','2']
    const step     = (now) => {
        const t    = Math.min(1, (now - start) / DURATION);
        const ease = 1 - (1 - t) * (1 - t);     // ease-out
        const str  = digits.map(d => String(Math.round(ease * Number(d)))).join('');
        node.textContent = str;
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
};

// ─── Public: render(result) ───────────────────────────────────────────────────

export const render = (result, vocId = null, onLangChange = null, onLayoutChange = null) => {
    const prev = document.getElementById(ID);
    prev?.remove();

    const strings = getStrings();
    const { score, handBalance, penaltyBreakdown,
            fingerLoad, hardestBigrams, hardestWords } = result;

    const panel = el('div');
    panel.id = ID;
    panel._kgResult   = result;
    panel._kgVocId    = vocId;
    panel._kgOnLang   = onLangChange;
    panel._kgOnLayout = onLayoutChange;

    const { header, miniScore } = buildHeader(panel, strings, score);
    panel.appendChild(header);
    panel.appendChild(buildDifficultyBar(result));

    const summary = el('div', 'panel-summary');
    appendAll(summary,
        buildStats(panel, result, strings, onLangChange, onLayoutChange),
        buildBar(score),
        buildLegend(strings),
    );
    panel.appendChild(summary);

    const details = el('div', 'panel-detail');
    appendAll(details,
        buildSection('balance',   strings.handBalance,      buildHandBar(handBalance, strings)),
        buildSection('penalties', strings.penaltyBreakdown, buildPenaltyBreakdown(penaltyBreakdown, strings)),
        buildSection('fingers',   strings.fingerLoad,       buildFingerLoad(fingerLoad, strings)),
        buildSection('bigrams',   strings.hardestBigrams,   buildHardestBigrams(hardestBigrams, strings)),
        buildSection('words',     strings.hardestWords,     buildHardestWords(hardestWords, strings)),
    );
    panel.appendChild(details);
    panel.appendChild(buildTextView(result, strings));

    applyInitialTheme(panel);
    applyInitialView(panel);
    applyInitialLang(panel);
    applyInitialSections(panel);
    if (prev) panel.classList.add('no-fade');
    updateKeyboard(panel, result.layoutLang, result.layoutName);

    document.body.appendChild(panel);
    makeDraggable(panel, panel.querySelector('.panel-header'), 'complexityFilterPanelPosition');

    // Animate both score nodes with the same logic
    const mainScoreNode = panel.querySelector('.score-value');
    if (mainScoreNode) animateScore(mainScoreNode, score);
    animateScore(miniScore, score);
};