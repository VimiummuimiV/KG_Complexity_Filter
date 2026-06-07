// ─── Typing complexity analyser ───────────────────────────────────────────────
// Pure algorithm — layout data lives in weights/<lang>/<layout>.js

import { configs } from './weights/weightsIndex.js';

// ─── Language detection ───────────────────────────────────────────────────────

// Count how many chars are recognised by a config: letters via layout, punctuation via shiftMap.
// Digits and whitespace are layout-neutral and excluded from scoring.
const detectConfig = (text) => {
    const sample = [...text].filter(ch => !/[\p{N} \n\r]/u.test(ch));
    if (sample.length === 0) return configs[0];
    const score = (cfg) => sample.filter(ch =>
        ch.toLowerCase() in cfg.layout || ch in cfg.shiftMap
    ).length;
    return configs.reduce((best, cfg) => score(cfg) >= score(best) ? cfg : best);
};

const configByLang = (lang) => configs.find(cfg => cfg.lang === lang) ?? null;

// Returns the lang of the next config after currentLang (wraps around).
export const nextLang = (currentLang) => {
    const idx = configs.findIndex(cfg => cfg.lang === currentLang);
    return configs[(idx + 1) % configs.length].lang;
};

const DIGIT_SET = new Set('1234567890');

// ─── Layout builder ───────────────────────────────────────────────────────────

const buildLayout = ({ layout, shiftMap, frequency, freqNorm = 11, weights: W }) => {
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
        const letterFreq    = frequency?.[base];
        const freqMax       = W.freqMax ?? 1.0;
        // Rare letters cost more — weaker muscle memory; frequency is a percentage,
        // normalised against the most frequent letter in the layout's language
        const freqPenalty   = letterFreq !== undefined
            ? freqMax * (1 - letterFreq / freqNorm)
            : freqMax;

        return W.row[row] + W.finger[finger] + freqPenalty
             + rhythmPenalty + shiftPenalty + digitPenalty;
    };

    // Returns { total, sameFinger, outwardRoll, scissor, rowJump } for one bigram.
    // Callers that only need the scalar sum it themselves.
    const bigramBreak = (a, b) => {
        const ka = keyOf(a); const kb = keyOf(b);
        if (!ka || !kb) return null;
        // Same key repeated (e.g. 666, ll, сс) — no repositioning, zero bigram cost
        if (baseOf(a) === baseOf(b)) return { total: 0, sameFinger: 0, outwardRoll: 0, scissor: 0, rowJump: 0, shiftAlt: 0, isOutward: false };
        const [fa, rowa, ha] = ka;
        const [fb, rowb, hb] = kb;

        let sameFinger = 0, outwardRoll = 0, scissor = 0, rowJump = 0, isOutward = false;

        // ── Shift alternation bonus / penalty ─────────────────────────────────
        // Pressing Shift with the same hand costs extra; opposite hand is free.
        let shiftAlt = 0;
        const aShifted = isShifted(a);
        const bShifted = isShifted(b);
        if (bShifted) {
            // Shift for b is on the opposite side from hb.
            const shiftHand = hb === 'L' ? 'R' : 'L';
            if (shiftHand === ha) shiftAlt = -(W.shiftAltBonus ?? 0.3); // reward
            else                  shiftAlt =   W.shiftAltPenalty ?? 0.4;  // same side
        }

        if (fa === fb) {
            sameFinger = W.sameFinger;
        } else if (ha === hb) {
            outwardRoll += W.sameHand + Math.abs(fa - fb) * W.colJump;
            // Scissor: adjacent fingers spanning 2+ rows — physically awkward
            if (Math.abs(fa - fb) === 1 && Math.abs(rowa - rowb) >= 2) scissor = W.scissor;
            // Inward rolls are natural; outward rolls (away from index) resist
            if (ha === 'L' && fb < fa) { outwardRoll += W.outwardRoll; isOutward = true; }
            if (ha === 'R' && fb > fa) { outwardRoll += W.outwardRoll; isOutward = true; }
        }
        rowJump = Math.abs(rowa - rowb) * W.rowJump;

        const total = sameFinger + outwardRoll + scissor + rowJump + shiftAlt;
        return { total, sameFinger, outwardRoll, scissor, rowJump, shiftAlt, isOutward };
    };

    const bigramCost = (a, b) => bigramBreak(a, b)?.total ?? 0;

    // Trigram analysis — detects redirects (direction reversal on same hand).
    // A redirect: all three keys on one hand and the middle key is NOT between
    // the outer two (finger index goes e.g. 2→4→3 instead of a smooth roll).
    const trigramPenalty = (a, b, c) => {
        const ka = keyOf(a); const kb = keyOf(b); const kc = keyOf(c);
        if (!ka || !kb || !kc) return 0;
        const [fa,, ha] = ka;
        const [fb,, hb] = kb;
        const [fc,, hc] = kc;
        if (ha !== hb || hb !== hc) return 0; // not same hand
        if (fa === fb || fb === fc) return 0;  // same-finger already penalised

        const goingRight = fb > fa;
        const redirect   = goingRight ? fc < fb : fc > fb;
        return redirect ? (W.redirect ?? 0.6) : 0;
    };

    return { isShifted, keyOf, baseOf, charCost, bigramCost, bigramBreak, trigramPenalty };
};

// ─── Public API ───────────────────────────────────────────────────────────────

// langHint: optional 2-char layout hint (e.g. 'RU', 'EN') — skips auto-detection when provided.
export const analyzeComplexity = (text, langHint = null) => {
    if (!text?.length) return null;
    const cfg = (langHint && configByLang(langHint)) ?? detectConfig(text);
    const {
        layout, weights: W, scoreMax, varWeight,
        segEasy, segMedium, lang,
    } = cfg;
    const { isShifted, keyOf, baseOf, charCost, bigramCost, bigramBreak, trigramPenalty } = buildLayout(cfg);

    const chars = [...text];
    const n     = chars.length;
    const costs = new Float32Array(n);

    let total      = 0;
    let capsRun    = 0;
    let unknowns   = 0;
    let handRun    = 0;
    let lastHand   = '';
    let leftKeys   = 0;
    let rightKeys  = 0;
    let wordStart  = -1;
    let wordCount  = 0;
    let longWords  = 0;
    let punctRun   = 0; // consecutive rhythm-break chars
    const longWordChars   = new Set(); // indices of chars in words long enough to trigger the length multiplier
    const sameFingerChars  = new Map(); // index → hand ('L'/'R') for same-finger bigram chars
    const shiftedChars     = new Set(); // indices of shifted characters
    const outwardRollChars = new Set(); // indices of chars in outward-roll bigrams
    const scissorChars     = new Set(); // indices of chars in scissor bigrams
    const rowJumpChars     = new Set(); // indices of chars in row-jump bigrams
    // Rolling window of recent finger presses — fatigue decays as fingers rest.
    // Each entry stores the index at which that press occurred; entries older than
    // fatigueBase*3 positions are discarded so cost doesn't grow without bound.
    const fingerHistory = [...Array(10)].map(() => []); // per-finger recent press indices
    const fingerCosts     = new Array(10).fill(0); // per-finger accumulated cost
    const charFingers     = new Int8Array(n).fill(-1); // per-char finger index (0-9), -1 if unmapped
    let   digitRowCount   = 0;                     // number-row keystroke count

    // Penalty buckets for breakdown chart
    const pb = { sameFinger: 0, shiftHold: 0, outwardRoll: 0, scissor: 0, rowJump: 0, other: 0 };

    const isRhythmBreak = (ch) => !/[\p{L}\p{N} \n\r]/u.test(ch);

    const closeWord = (end) => {
        const wordLen = end - wordStart;
        const mult = Math.min(
            W.wordLengthMax,
            1 + Math.max(0, wordLen - W.wordLengthBase) * W.wordLengthStep,
        );
        if (mult > 1) {
            for (let j = wordStart; j < end; j++) costs[j] *= mult;
            for (let j = wordStart + W.wordLengthBase; j < end; j++) longWordChars.add(j);
            longWords++;
        }
        wordCount++;
        wordStart = -1;
    };

    for (let i = 0; i < n; i++) {
        const ch  = chars[i];
        const key = keyOf(ch);

        // ── Caps Lock heuristic ───────────────────────────────────────────────
        if (isShifted(ch)) { capsRun++; } else { capsRun = 0; }

        // ── Unknown character tracking ────────────────────────────────────────
        if (!key && ch !== ' ' && ch !== '\n' && ch !== '\r' && !(baseOf(ch) in layout)) {
            unknowns++;
        }

        // ── Hand tracking + same-hand run surcharge ───────────────────────────
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

        // ── Punctuation cluster surcharge ─────────────────────────────────────
        // Each consecutive rhythm-break after the first adds a small escalating cost.
        if (isRhythmBreak(ch)) { punctRun++; } else { punctRun = 0; }
        const punctSurcharge = punctRun > 1
            ? (punctRun - 1) * (W.punctClusterStep ?? 0.3)
            : 0;

        // ── Per-finger fatigue surcharge ──────────────────────────────────────
        // Uses a rolling window: only presses within the last fatigueBase*3
        // positions count, so fatigue decays naturally as a finger rests.
        let fatigueSurcharge = 0;
        if (key) {
            const fi          = key[0];
            const fatigueBase = W.fatigueBase ?? 12;
            const fatigueStep = W.fatigueStep ?? 0.08;
            const windowSize  = fatigueBase * 3;
            const hist        = fingerHistory[fi];
            // Evict presses that are outside the rolling window
            while (hist.length > 0 && i - hist[0] > windowSize) hist.shift();
            hist.push(i);
            const recentCount = hist.length;
            if (recentCount > fatigueBase) {
                fatigueSurcharge = (recentCount - fatigueBase) * fatigueStep;
            }
        }

        // ── Core char + bigram costs ──────────────────────────────────────────
        const cc = charCost(ch, capsRun);
        const bg = i > 0 ? bigramBreak(chars[i - 1], ch) : null;
        const bc = bg?.total ?? 0;

        // ── Trigram penalty ───────────────────────────────────────────────────
        const tc = i > 1 ? trigramPenalty(chars[i - 2], chars[i - 1], ch) : 0;

        costs[i] = cc + bc + tc + runSurcharge + punctSurcharge + fatigueSurcharge;

        // ── Per-char annotation sets ──────────────────────────────────────────
        if (bg?.sameFinger > 0) {
            const hand = key?.[2] ?? 'L';
            sameFingerChars.set(i - 1, keyOf(chars[i - 1])?.[2] ?? hand);
            sameFingerChars.set(i, hand);
        }
        if (key && key[1] === 0) { digitRowCount++; }
        if (isShifted(ch))       shiftedChars.add(i);

        // ── Per-finger cost accumulation ──────────────────────────────────────
        if (key) {
            fingerCosts[key[0]] += costs[i];
            charFingers[i] = key[0];
        }

        // ── Word-length multiplier boundary tracking ──────────────────────────
        const isLetter = !!key && !DIGIT_SET.has(baseOf(ch));
        if (isLetter) {
            if (wordStart === -1) wordStart = i;
        } else if (wordStart !== -1) {
            closeWord(i);
        }

        // ── Penalty bucket attribution ────────────────────────────────────────
        if (bg) {
            pb.sameFinger  += bg.sameFinger;
            pb.outwardRoll += bg.outwardRoll;
            pb.scissor     += bg.scissor;
            pb.rowJump     += bg.rowJump;
            if (bg.isOutward)                { outwardRollChars.add(i - 1); outwardRollChars.add(i); }
            if (bg.scissor     > 0)          { scissorChars.add(i - 1);     scissorChars.add(i);     }
            if (bg.rowJump >= W.rowJump * 2) { rowJumpChars.add(i - 1);     rowJumpChars.add(i);     }
        }
        const shiftCost = isShifted(ch) && capsRun < W.capsLockAt ? W.shiftHold : 0;
        pb.shiftHold += shiftCost;
        pb.other += cc - shiftCost + runSurcharge + punctSurcharge + fatigueSurcharge + tc;
    }

    // Close the last word if text ends on a letter
    if (wordStart !== -1) closeWord(n);

    // Unreliable if too many chars are outside the layout
    if (unknowns / n > 0.1) return null;

    total = costs.reduce((s, c) => s + c, 0);

    const avg      = total / n;
    const variance = costs.reduce((s, c) => s + (c - avg) ** 2, 0) / n;
    const adjusted = avg + varWeight * Math.sqrt(variance);

    // ── Hand balance ──────────────────────────────────────────────────────────
    const totalKeys      = leftKeys + rightKeys;
    const imbalance      = totalKeys > 0
        ? Math.abs(leftKeys - rightKeys) / totalKeys
        : 0;
    const balancePenalty = imbalance * W.handImbalance;

    const score = Math.min(100, Math.round((adjusted + balancePenalty) / scoreMax * 100));

    // ── Window-smoothed segment colouring ─────────────────────────────────────
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

    // ── Worst zone ────────────────────────────────────────────────────────────
    // Highest total cost among hard segments of at least 4 chars (fall back to medium).
    // Total cost rather than average prevents single-char spikes from winning,
    // while still preferring genuinely dense clusters over long easy stretches.
    const worstZone = (() => {
        const MIN_LEN  = 4;
        const hardSegs = segments.filter(s => s.level === 'hard' && (s.end - s.start + 1) >= MIN_LEN);
        const pool     = hardSegs.length
            ? hardSegs
            : segments.filter(s => s.level === 'medium' && (s.end - s.start + 1) >= MIN_LEN);
        if (!pool.length) return null;
        const totalCost = s => {
            let sum = 0;
            for (let i = s.start; i <= s.end; i++) sum += costs[i];
            return sum;
        };
        return pool.reduce((best, s) => totalCost(s) > totalCost(best) ? s : best);
    })();

    // ── Bigram hotspots ───────────────────────────────────────────────────────
    const bigramTotals = {}; // baseKey → { pair, cost }
    for (let i = 1; i < n; i++) {
        const bc = bigramCost(chars[i - 1], chars[i]);
        if (bc > 0) {
            const key = baseOf(chars[i - 1]) + baseOf(chars[i]);
            if (!bigramTotals[key]) bigramTotals[key] = { pair: chars[i - 1] + chars[i], cost: 0 };
            bigramTotals[key].cost += bc;
        }
    }

    // Include all bigrams whose penalty cost is at least segEasy, covering 80%
    // of total bigram cost. No arbitrary cap — quality threshold does the filtering.
    const sorted      = Object.values(bigramTotals)
                              .filter(({ cost }) => cost >= segEasy)
                              .sort((a, b) => b.cost - a.cost);
    const bigramSum   = sorted.reduce((s, { cost }) => s + cost, 0);
    const threshold   = bigramSum * 0.8;
    let   accumulated = 0;
    const hardestBigrams  = [];
    for (const { pair, cost } of sorted) {
        hardestBigrams.push({ pair, cost: +cost.toFixed(1) });
        accumulated += cost;
        if (accumulated >= threshold) break;
    }

    // ── Per-word cost ranking ─────────────────────────────────────────────────
    // Re-derive word boundaries from the final costs array (after multipliers).
    // Deduplicate by lowercase form, keeping the highest cost occurrence.
    // Only include words whose avg cost/char reaches at least the medium threshold.
    const wordBest = new Map(); // normalised word → { word, cost }
    {
        let ws = -1;
        for (let i = 0; i <= n; i++) {
            const ch  = i < n ? chars[i] : null;
            const key = ch ? keyOf(ch) : null;
            const isLetter = !!key && /\p{L}/u.test(ch ?? '');
            if (isLetter) {
                if (ws === -1) ws = i;
            } else if (ws !== -1) {
                const word    = chars.slice(ws, i).join('');
                const wordSum = costs.slice(ws, i).reduce((s, c) => s + c, 0);
                const wordAvg = wordSum / (i - ws);
                if (wordAvg >= segEasy) {
                    const norm = word.toLowerCase();
                    const prev = wordBest.get(norm);
                    if (!prev || wordSum > prev.cost) wordBest.set(norm, { word, cost: +wordSum.toFixed(1) });
                }
                ws = -1;
            }
        }
    }
    const hardestWords = [...wordBest.values()].sort((a, b) => b.cost - a.cost);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const hardChars = segments
        .filter(s => s.level === 'hard')
        .reduce((sum, s) => sum + (s.end - s.start + 1), 0);
    const hardPct = Math.round(hardChars / n * 100);

    // Normalise penalty buckets to integer percentages of total accumulated cost
    const pbTotal = Object.values(pb).reduce((s, v) => s + v, 0);

    // Char counts per penalty type — derived from the annotation sets already built
    const pbCounts = {
        sameFinger:  Math.round(sameFingerChars.size / 2), // each bigram adds 2 entries
        shiftHold:   shiftedChars.size,
        outwardRoll: Math.round(outwardRollChars.size / 2),
        scissor:     Math.round(scissorChars.size / 2),
        rowJump:     Math.round(rowJumpChars.size / 2),
        other:       null, // base cost applies to all chars — no meaningful per-char count
    };

    const penaltyBreakdown = pbTotal > 0
        ? Object.fromEntries(
              Object.entries(pb).map(([k, v]) => [k, { pct: Math.round(v / pbTotal * 100), count: pbCounts[k] }])
          )
        : null;

    // ── Finger load (normalised to 0–100) ─────────────────────────────────────
    const fingerLoadTotal = fingerCosts.reduce((s, v) => s + v, 0);
    const fingerLoad = fingerCosts.map(v =>
        fingerLoadTotal > 0 ? Math.round(v / fingerLoadTotal * 100) : 0
    );

    // ── Number-row density ────────────────────────────────────────────────────
    const digitRowPct = Math.round(digitRowCount / n * 100);

    return {
        score,
        avg:          +avg.toFixed(3),
        length:       n,
        chars,
        segments,
        hardPct,
        longWordPct:  wordCount > 0 ? Math.round(longWords / wordCount * 100) : 0,
        longWordChars,
        sameFingerChars,
        shiftedChars,
        outwardRollChars,
        scissorChars,
        rowJumpChars,
        hardestBigrams,
        hardestWords,
        worstZone,
        penaltyBreakdown,
        handBalance:  { left: leftKeys, right: rightKeys, imbalance: +imbalance.toFixed(3) },
        fingerLoad,
        digitRowPct,
        charFingers,
        lang:        lang ?? 'RU',
    };
};