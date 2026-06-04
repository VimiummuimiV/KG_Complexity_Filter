// ─── Typing complexity analyser ───────────────────────────────────────────────
// Pure algorithm — layout data lives in weights/<lang>/<layout>.js

import { configs } from './weights/weightsIndex.js';

// ─── Language detection ───────────────────────────────────────────────────────

// Count how many chars belong to each config's layout (ignoring whitespace/digits)
const detectConfig = (text) => {
    const sample = [...text].filter(ch => /\p{L}/u.test(ch));
    if (sample.length === 0) return configs[0];
    const score = (cfg) => sample.filter(ch => ch.toLowerCase() in cfg.layout).length;
    return configs.reduce((best, cfg) => score(cfg) >= score(best) ? cfg : best);
};

const DIGIT_SET = new Set('1234567890');

const buildLayout = ({ layout, shiftMap, freq, weights: W }) => {
    // Punctuation and symbols break typing rhythm; letters/digits/whitespace do not
    const rhythmKeep    = /[\p{L}\p{N} \n\r]/u;
    const isRhythmBreak = (ch) => !rhythmKeep.test(ch);
    const baseOf        = (ch) => shiftMap[ch] ?? ch.toLowerCase();
    const isShifted     = (ch) => ch in shiftMap || ch !== ch.toLowerCase();
    const keyOf         = (ch) => layout[baseOf(ch)];

    const charCost = (ch, capsRun = 0) => {
        if (ch === ' ' || ch === '\n' || ch === '\r') return 0.5;

        const base          = baseOf(ch);
        const key           = layout[base];
        const rhythmPenalty = isRhythmBreak(ch) ? W.rhythmBreak : 0;
        // After enough consecutive capitals the user likely switched to Caps Lock,
        // so the per-key pinky-hold cost no longer applies
        const shiftPenalty  = isShifted(ch) && capsRun < W.capsLockAt
                              ? W.shiftHold : 0;

        if (!key) return W.unknown + rhythmPenalty + shiftPenalty;

        const [finger, row] = key;
        const digitPenalty  = DIGIT_SET.has(base) ? W.digit : 0;
        const letterFreq    = freq?.[base];
        const freqMax       = W.freqMax ?? 1.0;
        // Rare letters cost more — weaker muscle memory; freq is a percentage,
        // normalised against the most common letter (~11%)
        const freqPenalty   = letterFreq !== undefined
            ? freqMax * (1 - letterFreq / 11)
            : freqMax;

        return W.row[row] + W.finger[finger] + freqPenalty
             + rhythmPenalty + shiftPenalty + digitPenalty;
    };

    // Returns { total, sameFinger, outwardRoll, scissor, rowJump } for one bigram.
    // Callers that only need the scalar sum it themselves.
    const bigramBreak = (a, b) => {
        const ka = keyOf(a); const kb = keyOf(b);
        if (!ka || !kb) return null;
        const [fa, rowa, ha] = ka;
        const [fb, rowb, hb] = kb;

        let sameFinger = 0, outwardRoll = 0, scissor = 0, rowJump = 0;

        if (fa === fb) {
            sameFinger = W.sameFinger;
        } else if (ha === hb) {
            outwardRoll += W.sameHand + Math.abs(fa - fb) * W.colJump;
            // Scissor: adjacent fingers spanning 2+ rows — physically awkward
            if (Math.abs(fa - fb) === 1 && Math.abs(rowa - rowb) >= 2) scissor = W.scissor;
            // Inward rolls are natural; outward rolls (away from index) resist
            if (ha === 'L' && fb < fa) outwardRoll += W.outwardRoll;
            if (ha === 'R' && fb > fa) outwardRoll += W.outwardRoll;
        }
        rowJump = Math.abs(rowa - rowb) * W.rowJump;

        return { total: sameFinger + outwardRoll + scissor + rowJump,
                 sameFinger, outwardRoll, scissor, rowJump };
    };

    const bigramCost = (a, b) => bigramBreak(a, b)?.total ?? 0;

    return { isShifted, keyOf, baseOf, charCost, bigramCost, bigramBreak };
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const analyzeComplexity = (text, config = null) => {
    if (!text?.length) return null;
    const cfg = config ?? detectConfig(text);
    const { layout, weights: W, scoreMax, varWeight, segEasy, segMedium, lang, layoutName } = cfg;
    const { isShifted, keyOf, baseOf, charCost, bigramCost, bigramBreak } = buildLayout(cfg);

    const chars = [...text];
    const n     = chars.length;
    const costs = new Float32Array(n);

    let total     = 0;
    let capsRun   = 0;
    let unknowns  = 0;
    let handRun   = 0;
    let lastHand  = '';
    let leftKeys  = 0;
    let rightKeys = 0;
    let wordStart = -1; // -1 = not in a letter-run
    let wordCount = 0;
    let longWords = 0;
    const longWordChars = new Set();

    const closeWord = (end) => {
        const wordLen = end - wordStart;
        const mult    = Math.min(W.wordLengthMax,
                            1 + Math.max(0, wordLen - W.wordLengthBase) * W.wordLengthStep);
        if (mult > 1) {
            for (let j = wordStart; j < end; j++) { costs[j] *= mult; longWordChars.add(j); }
            longWords++;
        }
        wordCount++;
        wordStart = -1;
    };

    // Penalty buckets for breakdown chart
    const pb = { sameFinger: 0, outwardRoll: 0, scissor: 0, rowJump: 0, other: 0 };

    for (let i = 0; i < n; i++) {
        const ch  = chars[i];
        const key = keyOf(ch);

        // Track consecutive capitals for the Caps Lock heuristic
        if (isShifted(ch)) { capsRun++; } else { capsRun = 0; }

        // Count chars that are not in the layout and not whitespace/punctuation
        if (!key && ch !== ' ' && ch !== '\n' && ch !== '\r' && !(baseOf(ch) in layout)) {
            unknowns++;
        }

        // Track same-hand run; spaces/punctuation break the streak
        if (key) {
            const hand = key[2];
            if (hand === lastHand) { handRun++; } else { handRun = 1; lastHand = hand; }
            if (hand === 'L') leftKeys++; else rightKeys++;
        } else {
            handRun = 0; lastHand = '';
        }

        // Escalate cost for sustained one-hand runs past the threshold
        const runSurcharge = handRun > W.handRunBase
            ? (handRun - W.handRunBase) * W.handRunStep
            : 0;

        const cc = charCost(ch, capsRun);
        const bg = i > 0 ? bigramBreak(chars[i - 1], ch) : null;
        const bc = bg?.total ?? 0;

        costs[i] = cc + bc + runSurcharge;

        // Track letter-run boundaries for the word-length multiplier.
        // Digits don't count as word letters — they can appear mid-word (e.g. "CO2") but
        // don't contribute to the typing-flow length that makes long words hard.
        const isLetter = !!key && !DIGIT_SET.has(baseOf(ch));
        if (isLetter) {
            if (wordStart === -1) wordStart = i;
        } else if (wordStart !== -1) {
            closeWord(i);
        }

        // Attribute costs to named buckets
        if (bg) {
            pb.sameFinger  += bg.sameFinger;
            pb.outwardRoll += bg.outwardRoll;
            pb.scissor     += bg.scissor;
            pb.rowJump     += bg.rowJump;
        }
        pb.other += cc + runSurcharge;
    }

    // Close the last word if text ends on a letter
    if (wordStart !== -1) closeWord(n);

    // Unreliable if too many chars are outside the layout
    if (unknowns / n > 0.1) return null;

    total = costs.reduce((s, c) => s + c, 0);

    const avg      = total / n;
    const variance = costs.reduce((s, c) => s + (c - avg) ** 2, 0) / n;
    const adjusted = avg + varWeight * Math.sqrt(variance);

    // Hand balance penalty: 0 at perfect 50/50, scales to W.handImbalance at fully one-sided
    const totalKeys      = leftKeys + rightKeys;
    const imbalance      = totalKeys > 0
        ? Math.abs(leftKeys - rightKeys) / totalKeys
        : 0;
    const balancePenalty = imbalance * W.handImbalance;

    const score = Math.min(100, Math.round((adjusted + balancePenalty) / scoreMax * 100));

    // Window-smoothed segment coloring
    const WINDOW   = 4;
    const segments = [];
    let   seg      = null;

    for (let i = 0; i < n; i++) {
        let sum = 0, cnt = 0;
        for (let j = Math.max(0, i - WINDOW); j <= Math.min(n - 1, i + WINDOW); j++) {
            sum += costs[j]; cnt++;
        }
        const avg_w = sum / cnt;
        const level = avg_w < segEasy   ? 'easy'
                    : avg_w < segMedium ? 'medium'
                    : 'hard';

        if (!seg || seg.level !== level) {
            seg = { start: i, end: i, level };
            segments.push(seg);
        } else {
            seg.end = i;
        }
    }

    // Per-bigram cost accumulators for hotspot stats
    const bigramTotals = {};

    for (let i = 1; i < n; i++) {
        const bc = bigramCost(chars[i - 1], chars[i]);
        if (bc > 0) {
            const key = baseOf(chars[i - 1]) + baseOf(chars[i]);
            bigramTotals[key] = (bigramTotals[key] ?? 0) + bc;
        }
    }

    // Show enough bigrams to cover 80% of total bigram cost, capped at 10
    const sorted      = Object.entries(bigramTotals).sort((a, b) => b[1] - a[1]);
    const bigramSum   = sorted.reduce((s, [, v]) => s + v, 0);
    const threshold   = bigramSum * 0.8;
    let   accumulated = 0;
    const topBigrams  = [];
    for (const [pair, cost] of sorted) {
        topBigrams.push({ pair, cost: +cost.toFixed(1) });
        accumulated += cost;
        if (accumulated >= threshold || topBigrams.length >= 10) break;
    }

    // Percentage of characters in hard segments
    const hardChars = segments
        .filter(s => s.level === 'hard')
        .reduce((sum, s) => sum + (s.end - s.start + 1), 0);
    const hardPct = Math.round(hardChars / n * 100);

    // Normalise penalty buckets to integer percentages of total accumulated cost
    const pbTotal = Object.values(pb).reduce((s, v) => s + v, 0);
    const penaltyBreakdown = pbTotal > 0
        ? Object.fromEntries(
              Object.entries(pb).map(([k, v]) => [k, Math.round(v / pbTotal * 100)])
          )
        : null;

    return {
        score,
        avg: +avg.toFixed(3),
        length: n,
        chars,
        segments,
        hardPct,
        longWordPct: wordCount > 0 ? Math.round(longWords / wordCount * 100) : 0,
        longWordChars,
        topBigrams,
        penaltyBreakdown,
        handBalance: { left: leftKeys, right: rightKeys, imbalance: +imbalance.toFixed(3) },
        lang:        lang       ?? 'ru',
        layoutName:  layoutName ?? 'ЙЦУКЕН',
    };
};