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
import { buildToggleBtn } from '../helpers/button';
import { onHoverDelegate } from '../helpers/events';
import { openKeyboard, updateKeyboard, getKeyboard, closeKeyboard } from './keyboard';
import { getKbPref, setKbPref } from '../helpers/keyboardConfig';

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
        constrain(panel);
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

const buildViewToggleBtn = (panel) => buildToggleBtn(
    'panel-view',
    ['eye-fill', 'eye-off-fill', 'eye-close-fill'],
    () => {
        const s    = getStrings();
        const view = panel.dataset.view ?? 'full';
        const next = { full: 'summary', summary: 'minimal', minimal: 'full' }[view];
        return `[${s.tooltipClick}]${s['tooltipView_' + next]}`;
    },
    () => { cycleView(panel); constrain(panel); },
);

const buildThemeBtn = (panel) => buildToggleBtn(
    'panel-theme',
    ['sun-fill', 'moon-fill'],
    () => {
        const s     = getStrings();
        const theme = panel.dataset.complexityFilterTheme ?? 'dark';
        return `[${s.tooltipClick}]${theme === 'dark' ? s.tooltipThemeLight : s.tooltipThemeDark}`;
    },
    () => {
        toggleTheme(panel);
        const { _kgResult } = panel;
        updateKeyboard(panel, _kgResult?.layoutLang, _kgResult?.layoutName, _kgResult?.keyCounts, _kgResult?.keyCosts);
    },
);

// Language toggle — flag icon showing the OTHER language.
const buildLangBtn = (panel) => buildToggleBtn(
    'panel-lang',
    ['ruFlag', 'enFlag'],
    () => {
        const s = getStrings();
        return `[${s.tooltipClick}]${s.langLabel}`;
    },
    () => {
        toggleLang(panel);
        const { _kgResult, _kgVocId, _kgOnLang, _kgOnLayout } = panel;
        if (_kgResult) render(_kgResult, _kgVocId, _kgOnLang, _kgOnLayout);
    },
);

const buildKeyboardBtn = (panel) => {
    const btn = buildToggleBtn(
        'panel-keyboard',
        ['keyboard-fill'],
        () => {
            const s = getStrings();
            const hints = [
                `[${s.tooltipClick}]${getKeyboard() ? s.tooltipHideKeyboard : s.tooltipShowKeyboard}`,
                `[Shift + ${s.tooltipClick}]${getKbPref('open') ? s.tooltipKeyboardUnpin : s.tooltipKeyboardPin}`,
            ];
            return hints.join(' ');
        },
        (e) => {
            const { _kgResult } = panel;
            if (!_kgResult) return;
            if (getKeyboard()) {
                closeKeyboard();
                if (e.shiftKey) {
                    setKbPref('open', false);
                    btn.classList.remove('panel-btn--active');
                }
            } else {
                openKeyboard(panel, _kgResult.layoutLang, _kgResult.layoutName, _kgResult.keyCounts, _kgResult.keyCosts);
                if (e.shiftKey) {
                    setKbPref('open', true);
                    btn.classList.add('panel-btn--active');
                }
            }
        },
    );
    return btn;
};

const buildHeader = (panel, strings, score) => {
    const header = el('div', 'panel-header');

    const miniScore = makeScoreNode('header-score');
    miniScore.style.color = scoreColor(score);

    const closeBtn = buildToggleBtn(
        'panel-close',
        ['close-line'],
        () => getStrings().btnClose,
        () => { closeKeyboard(); panel.remove(); },
    );

    const btnGroup = el('div', 'panel-btn-group');
    appendAll(btnGroup,
        buildViewToggleBtn(panel),
        buildThemeBtn(panel),
        buildLangBtn(panel),
        buildKeyboardBtn(panel),
        closeBtn,
    );

    appendAll(header,
        elText('span', 'panel-logo',  'KG'),
        elText('span', 'panel-title', strings.title),
        miniScore,
        btnGroup,
    );

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
                    if (e.shiftKey) onLayoutChange?.(layoutLang, layoutName);
                    else            onLangChange?.(layoutLang, layoutName);
                });
                valNode.addEventListener('mouseenter', () => {
                    const strings = getStrings();
                    const hints = [
                        `[${layoutLang} | ${layoutName}]`,
                        `[${strings.tooltipClick}]${strings.tooltipLang}`,
                        onLayoutChange ? `[Shift + ${strings.tooltipClick}]${strings.tooltipLayout}` : null,
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

const buildHandBar = ({ left, right, imbalance }, strings, panel) => {
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

    track.addEventListener('mousemove', (e) => {
        panel.dataset.activeHand = e.offsetX / track.offsetWidth < leftPct / 100 ? 'L' : 'R';
    });
    track.addEventListener('mouseleave', () => { delete panel.dataset.activeHand; });

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
        row.dataset.penaltyKey = key;
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
        const tipKey = `tooltipPenalty_${key}`;
        if (strings[tipKey]) {
            const tip = count != null
                ? `${strings[tipKey]} | ${pct}% | ${count}`
                : `${strings[tipKey]} | ${pct}%`;
            createCustomTooltip(row, tip, 'stats', 0);
        }
        legend.appendChild(row);
    }

    wrap.appendChild(legend);

    return wrap;
};

const buildHardestBigrams = (hardestBigrams, strings) => {
    if (!hardestBigrams?.length) return null;

    const wrap = el('div', 'hotspot-section');

    const list = el('div', 'hotspot-list');
    for (const { pair, basePair, cost, count } of hardestBigrams) {
        const chip = el('div', 'hotspot-chip');
        chip.dataset.pair     = pair;
        chip.dataset.basePair = basePair;
        appendAll(chip,
            elText('span', 'hotspot-ch', pair),
            elText('span', 'hotspot-cost', cost),
        );
        createCustomTooltip(chip, `${strings.tooltipBigram} | ${count}`, 'stats', 0);
        list.appendChild(chip);
    }

    wrap.appendChild(list);
    return wrap;
};

// Per-finger load bars
const buildFingerLoad = (fingerLoad, fingerCounts, strings) => {
    const wrap = el('div', 'finger-load-wrap');

    const bars = el('div', 'finger-load-bars');
    const max  = Math.max(...fingerLoad, 1);

    for (let i = 0; i < fingerLoad.length; i++) {
        const pct  = fingerLoad[i];
        const col  = i < 5 ? 'var(--hand-l)' : 'var(--hand-r)';
        const item = el('div', 'fl-item');

        const barWrap = el('div', 'fl-bar-wrap');
        barWrap.dataset.finger = i;

        const fill = el('div', 'fl-bar-fill');
        fill.style.height     = Math.round(pct / max * 100) + '%';
        fill.style.background = col;
        barWrap.appendChild(fill);
        createCustomTooltip(barWrap, `${strings.fingers[i]}: ${pct}% | ${fingerCounts[i]}`, 'stats', 0);

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
    for (const { word, cost, count } of hardestWords) {
        const chip = el('div', 'hotspot-chip');
        chip.dataset.word = word;
        appendAll(chip,
            elText('span', 'hotspot-ch', word),
            elText('span', 'hotspot-cost', cost),
        );
        createCustomTooltip(chip, `${strings.tooltipTopWord} | ${count}`, 'stats', 0);
        list.appendChild(chip);
    }

    wrap.appendChild(list);
    return wrap;
};

const buildTextView = ({ chars, segments, longWordChars, worstZone,
                         sameFingerChars, shiftedChars, charFingers, charBases,
                         outwardRollChars, scissorChars, rowJumpChars }, strings) => {
    const text = el('div', 'panel-text');

    const penaltyChars = {
        sameFinger:  sameFingerChars,
        shiftHold:   shiftedChars,
        outwardRoll: outwardRollChars,
        scissor:     scissorChars,
        rowJump:     rowJumpChars,
    };
    const PENALTY_KEYS = ['sameFinger', 'shiftHold', 'outwardRoll', 'scissor', 'rowJump'];

    for (const seg of segments) {
        const { level, start, end } = seg;
        const isWorst = worstZone && seg === worstZone;

        for (let k = start; k <= end; k++) {
            const span   = elText('span', level, chars[k]);
            const isLong = longWordChars?.has(k) ?? false;
            const sfHand = sameFingerChars?.get(k);
            const finger = charFingers?.[k] ?? -1;
            const isShifted = shiftedChars?.has(k) ?? false;

            if (isLong)          span.classList.add('long-word');
            if (isWorst)         span.classList.add('worst-zone');
            if (sfHand === 'L')  span.classList.add('same-finger-l');
            if (sfHand === 'R')  span.classList.add('same-finger-r');
            if (isShifted)       span.classList.add('shifted-char');
            if (finger >= 0) {
                span.dataset.finger = finger;
                span.dataset.hand   = finger < 5 ? 'L' : 'R';
            }

            const base = charBases?.[k];
            if (base != null) span.dataset.key = base;

            const penalties = PENALTY_KEYS.filter(pk => penaltyChars[pk]?.has(k));
            if (!penalties.length && finger >= 0) penalties.push('other');
            span.dataset.penalty = penalties.join(' ');

            const tooltipText =
                isLong    ? strings.tooltipLongWordText :
                isWorst   ? strings.tooltipWorstZone :
                sfHand === 'L' ? strings.tooltipSameFingerL :
                sfHand === 'R' ? strings.tooltipSameFingerR :
                ({
                    hard: strings.tooltipHardText,
                    medium: strings.tooltipMediumText,
                    easy: strings.tooltipEasyText,
                })[level];

            if (tooltipText && !isShifted) {
                createCustomTooltip(span, tooltipText, 'stats', 0);
            }

            text.appendChild(span);
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
            fingerLoad, fingerCounts, hardestBigrams, hardestWords } = result;

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
        buildSection('balance',   strings.handBalance,      buildHandBar(handBalance, strings, panel)),
        buildSection('penalties', strings.penaltyBreakdown, buildPenaltyBreakdown(penaltyBreakdown, strings)),
        buildSection('fingers',   strings.fingerLoad,       buildFingerLoad(fingerLoad, fingerCounts, strings)),
        buildSection('bigrams',   strings.hardestBigrams,   buildHardestBigrams(hardestBigrams, strings)),
        buildSection('words',     strings.hardestWords,     buildHardestWords(hardestWords, strings)),
    );
    panel.appendChild(details);
    panel.appendChild(buildTextView(result, strings));

    applyInitialTheme(panel);
    applyInitialView(panel);
    applyInitialLang(panel);
    applyInitialSections(panel);
    if (prev) {
        panel.classList.add('no-fade');
        updateKeyboard(panel, result.layoutLang, result.layoutName, result.keyCounts, result.keyCosts);
    } else {
        if (getKbPref('open')) {
            openKeyboard(panel, result.layoutLang, result.layoutName, result.keyCounts, result.keyCosts);
            panel.querySelector('.panel-keyboard')?.classList.add('panel-btn--active');
        }
    }

    document.body.appendChild(panel);
    makeDraggable(panel, panel.querySelector('.panel-header'), 'complexityPanel');

    onHoverDelegate(panel, '.penalty-row',
        (t) => { panel.dataset.activePenalty = t.dataset.penaltyKey; },
        ()  => { delete panel.dataset.activePenalty; },
    );
    onHoverDelegate(panel, '.fl-bar-wrap',
        (t) => { panel.dataset.activeFinger = t.dataset.finger; },
        ()  => { delete panel.dataset.activeFinger; },
    );

    const allSpans = [...panel.querySelectorAll('.panel-text span')];
    const { chars: txtChars, charBases } = result;
    let activeHotspotSpans = [];

    onHoverDelegate(panel, '.hotspot-chip',
        (t) => {
            for (const s of activeHotspotSpans) s.classList.remove('hotspot-hl');
            const spans = [];
            if (t.dataset.pair) {
                const basePair = t.dataset.basePair;
                for (let i = 1; i < txtChars.length; i++) {
                    if (charBases[i - 1] + charBases[i] === basePair)
                        spans.push(allSpans[i - 1], allSpans[i]);
                }
            } else {
                const word = t.dataset.word.toLowerCase();
                const len  = word.length;
                for (let i = 0; i <= txtChars.length - len; i++) {
                    if (txtChars.slice(i, i + len).join('').toLowerCase() === word)
                        spans.push(...allSpans.slice(i, i + len));
                }
            }
            activeHotspotSpans = spans;
            for (const s of activeHotspotSpans) s.classList.add('hotspot-hl');
            panel.dataset.activeHotspot = '';
        },
        () => {
            for (const s of activeHotspotSpans) s.classList.remove('hotspot-hl');
            activeHotspotSpans = [];
            delete panel.dataset.activeHotspot;
        },
    );

    // Animate both score nodes with the same logic
    const mainScoreNode = panel.querySelector('.score-value');
    if (mainScoreNode) animateScore(mainScoreNode, score);
    animateScore(miniScore, score);
};