// ─── Typing complexity analyser ───────────────────────────────────────────────
// Pure algorithm — layout data lives in weights/<lang>/<layout>.js

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

    const bigramCost = (a, b) => {
        const ka = keyOf(a); const kb = keyOf(b);
        if (!ka || !kb) return 0;
        const [fa, rowa, ha] = ka;
        const [fb, rowb, hb] = kb;

        let cost = 0;
        if (fa === fb) {
            cost += W.sameFinger;
        } else if (ha === hb) {
            cost += W.sameHand;
            // Lateral travel: fingers spread wider on the same hand
            cost += Math.abs(fa - fb) * W.colJump;
            // Scissor: adjacent fingers spanning 2+ rows — physically awkward
            if (Math.abs(fa - fb) === 1 && Math.abs(rowa - rowb) >= 2) cost += W.scissor;
            // Inward rolls are natural; outward rolls (away from index) resist
            if (ha === 'L' && fb < fa) cost += W.outwardRoll;
            if (ha === 'R' && fb > fa) cost += W.outwardRoll;
        }
        cost += Math.abs(rowa - rowb) * W.rowJump;
        return cost;
    };

    return { isShifted, keyOf, baseOf, charCost, bigramCost };
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const analyzeComplexity = (text, config) => {
    if (!text?.length) return null;

    const { layout, weights: W, scoreMax, varWeight, segEasy, segMedium } = config;
    const { isShifted, keyOf, baseOf, charCost, bigramCost } = buildLayout(config);

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

        const c = charCost(ch, capsRun)
                + (i > 0 ? bigramCost(chars[i - 1], chars[i]) : 0)
                + runSurcharge;
        costs[i] = c;
        total   += c;
    }

    // Unreliable if too many chars are outside the layout
    if (unknowns / n > 0.1) return null;

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

    return {
        score,
        avg: +avg.toFixed(3),
        length: n,
        chars,
        segments,
        handBalance: { left: leftKeys, right: rightKeys, imbalance: +imbalance.toFixed(3) },
    };
};