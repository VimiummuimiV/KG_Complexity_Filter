// ─── Finger / Row / Hand mapping ────────────────────────────────────────────
// finger: 0=L-pinky  1=L-ring  2=L-middle  3=L-index  4=L-index-stretch
//         5=R-index-stretch  6=R-index  7=R-middle  8=R-ring  9=R-pinky
// row:    0=digit  1=top  2=home  3=bottom

const LAYOUT = {
    // ── digit row ──────────────────────────────────────────────────────────
    'ё':[0,0,'L'],
    '1':[0,0,'L'], '2':[1,0,'L'], '3':[2,0,'L'], '4':[3,0,'L'], '5':[4,0,'L'],
    '6':[5,0,'R'], '7':[6,0,'R'], '8':[7,0,'R'], '9':[8,0,'R'], '0':[9,0,'R'],
    '-':[9,0,'R'], '=':[9,0,'R'],

    // ── top row ────────────────────────────────────────────────────────────
    'й':[0,1,'L'], 'ц':[1,1,'L'], 'у':[2,1,'L'], 'к':[3,1,'L'], 'е':[4,1,'L'],
    'н':[5,1,'R'], 'г':[6,1,'R'], 'ш':[7,1,'R'], 'щ':[8,1,'R'],
    'з':[9,1,'R'], 'х':[9,1,'R'], 'ъ':[9,1,'R'],

    // ── home row ───────────────────────────────────────────────────────────
    'ф':[0,2,'L'], 'ы':[1,2,'L'], 'в':[2,2,'L'], 'а':[3,2,'L'], 'п':[4,2,'L'],
    'р':[5,2,'R'], 'о':[6,2,'R'], 'л':[7,2,'R'], 'д':[8,2,'R'],
    'ж':[9,2,'R'], 'э':[9,2,'R'],

    // ── bottom row ─────────────────────────────────────────────────────────
    'я':[0,3,'L'], 'ч':[1,3,'L'], 'с':[2,3,'L'], 'м':[3,3,'L'], 'и':[4,3,'L'],
    'т':[5,3,'R'], 'ь':[6,3,'R'], 'б':[7,3,'R'], 'ю':[8,3,'R'],
    '.':[9,3,'R'], '/':[9,3,'R'],
};

// Shift+symbol → base key  (uppercase letters are resolved via toLowerCase)
const SHIFT_MAP = {
    // ── digit row: shift+key ───────────────────────────────────────────────
    '!':'1', '"':'2', '№':'3', ';':'4', '%':'5',
    ':':'6', '?':'7', '*':'8', '(':'9', ')':'0',
    '_':'-', '+':'=',

    // ── bottom row: shift+key ──────────────────────────────────────────────
    ',':'.', '\\':'/',
};

// ─── Russian letter frequency (approx %) ────────────────────────────────────
const FREQ_RU = {
    'о':10.97,'е':8.45,'а':7.99,'и':7.37,'н':6.70,'т':6.26,'с':5.47,'р':4.73,
    'в':4.54,'л':4.34,'к':3.49,'м':3.21,'д':2.98,'п':2.81,'у':2.62,'я':2.01,
    'ы':1.90,'ь':1.74,'г':1.72,'з':1.65,'б':1.59,'ч':1.44,'й':1.21,'х':0.97,
    'ж':0.94,'ш':0.73,'ю':0.64,'ц':0.48,'щ':0.36,'э':0.32,'ф':0.26,'ъ':0.04,
};

// ─── Weights ─────────────────────────────────────────────────────────────────
const W = {
    row:         { 2:0, 1:1.0, 3:1.5, 0:2.5 },
    finger:      [2.0, 1.5, 1.0, 0.5, 0.7,  0.7, 0.5, 1.0, 1.5, 2.0],
    freqMax:     1.0,   // max surcharge for rare letters
    digit:       1.5,   // extra reach cost for digit-row keys
    unknown:     3.5,   // chars not in layout at all
    shiftHold:   3.0,   // pinky held down while pressing another key
    rhythmBreak: 1.5,   // non-alphanumeric chars break flow
    sameFinger:  3.0,
    sameHand:    0.8,
    rowJump:     0.6,   // per row of distance
    outwardRoll: 0.5,
    colJump:     0.15,  // per-finger lateral distance (same hand, different fingers)
    scissor:     0.8,   // adjacent fingers spanning ≥2 rows (awkward stretch)
    handRunBase: 4,     // same-hand streak length before escalation kicks in
    handRunStep: 0.12,  // extra cost added per char beyond the threshold
    handImbalance: 0.6, // max penalty added to avg cost when text is fully one-sided
};

// Consecutive capitals before assuming Caps Lock is used (stops per-key shift penalty)
const CAPS_LOCK_THRESHOLD = 4;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIGIT_SET = new Set('1234567890');

// Chars that break typing rhythm: not a letter, digit, space, or newline
const isRhythmBreak = (ch) => !/[а-яёА-ЯЁa-zA-Z0-9 \n\r]/u.test(ch);

// Resolve a char to its base key: symbol map first, then lowercase (for uppercase letters)
const baseOf = (ch) => SHIFT_MAP[ch] ?? ch.toLowerCase();

// True when ch required Shift to type
const isShifted = (ch) => ch in SHIFT_MAP || ch !== ch.toLowerCase();

// Resolve a char to its physical LAYOUT entry
const keyOf = (ch) => LAYOUT[baseOf(ch)];

// charCost is now a stateful call that also receives the consecutive-caps
// count so it can suppress the shift penalty when Caps Lock is likely active.
const charCost = (ch, capsRun = 0) => {
    if (ch === ' ' || ch === '\n' || ch === '\r') return 0.5;

    const base          = baseOf(ch);
    const key           = LAYOUT[base];
    const rhythmPenalty = isRhythmBreak(ch) ? W.rhythmBreak : 0;
    // Once the user has pressed enough consecutive capitals they almost
    // certainly switched to Caps Lock, so the per-key pinky-hold cost drops.
    const shiftPenalty  = isShifted(ch) && capsRun < CAPS_LOCK_THRESHOLD
                          ? W.shiftHold : 0;

    if (!key) return W.unknown + rhythmPenalty + shiftPenalty;

    const [finger, row] = key;
    const digitPenalty  = DIGIT_SET.has(base) ? W.digit : 0;
    const freq          = FREQ_RU[base];
    const freqPenalty   = freq !== undefined ? W.freqMax * (1 - freq / 11) : W.freqMax;

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

        // Lateral distance between fingers on the same hand
        cost += Math.abs(fa - fb) * W.colJump;

        // Scissor: adjacent fingers (1 apart) spanning 2+ rows — awkward stretch
        if (Math.abs(fa - fb) === 1 && Math.abs(rowa - rowb) >= 2) {
            cost += W.scissor;
        }

        // Outward roll penalty
        if (ha === 'L' && fb < fa) cost += W.outwardRoll;
        if (ha === 'R' && fb > fa) cost += W.outwardRoll;
    }

    cost += Math.abs(rowa - rowb) * W.rowJump;
    return cost;
};

// ─── Score scaling ────────────────────────────────────────────────────────────
// Calibrated against real text samples:
//   plain prose     → adj ~3.2  → score ~36
//   rare words      → adj ~3.5  → score ~39
//   heavy punct     → adj ~4.9  → score ~54
//   dense digits    → adj ~6.6  → score ~73
//   pure symbols    → adj ~8.0  → score ~89
//
// score = (avg + VAR_WEIGHT * stddev) / SCORE_MAX * 100
// Variance term gives extra weight to texts with spiky hard zones

const SCORE_MAX  = 9.0;
const VAR_WEIGHT = 0.25;

// Segment coloring thresholds (applied to windowed per-char cost)
const SEG_EASY   = 3.0;   // green
const SEG_MEDIUM = 5.5;   // yellow; above → red

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Analyse typing complexity of `text` for ЙЦУКЕН layout.
 *
 * Returns {
 *   score   : 0–100  overall difficulty
 *   avg     : raw average cost per character
 *   length  : character count
 *   chars   : Array of individual characters
 *   segments: { start, end, level }[]  level = 'easy' | 'medium' | 'hard'
 * }
 */
export const analyzeComplexity = (text) => {
    if (!text?.length) return null;

    const chars = [...text];
    const n     = chars.length;
    const costs = new Float32Array(n);

    let total    = 0;
    let capsRun  = 0;   // consecutive shifted (capital) characters
    let unknowns = 0;   // characters not found in the layout
    let handRun  = 0;   // consecutive characters on the same hand
    let lastHand = '';  // 'L', 'R', or '' for non-keyed chars
    let leftKeys = 0;   // total keyed characters on left hand
    let rightKeys= 0;   // total keyed characters on right hand

    for (let i = 0; i < n; i++) {
        const ch  = chars[i];
        const key = keyOf(ch);

        // Track caps run for the Caps Lock heuristic
        if (isShifted(ch)) { capsRun++; } else { capsRun = 0; }

        // Count truly unknown chars (not in layout and not whitespace/punct)
        if (!key && ch !== ' ' && ch !== '\n' && ch !== '\r' && !(baseOf(ch) in LAYOUT)) {
            unknowns++;
        }

        // Track same-hand run; spaces/punctuation reset it
        if (key) {
            const hand = key[2];
            if (hand === lastHand) { handRun++; } else { handRun = 1; lastHand = hand; }
            if (hand === 'L') leftKeys++; else rightKeys++;
        } else {
            handRun = 0; lastHand = '';
        }

        // Escalation surcharge for sustained one-hand runs
        const runSurcharge = handRun > W.handRunBase
            ? (handRun - W.handRunBase) * W.handRunStep
            : 0;

        const c = charCost(ch, capsRun)
                + (i > 0 ? bigramCost(chars[i - 1], chars[i]) : 0)
                + runSurcharge;
        costs[i] = c;
        total   += c;
    }

    // If more than 10% of characters are unknown the score is unreliable
    if (unknowns / n > 0.1) return null;

    const avg      = total / n;
    const variance = costs.reduce((s, c) => s + (c - avg) ** 2, 0) / n;
    const adjusted = avg + VAR_WEIGHT * Math.sqrt(variance);

    // Hand balance penalty: how far the text drifts from 50/50 L/R distribution.
    // imbalance = 0 at perfect balance, 1 at all-one-hand.
    // A fully one-sided text adds up to W.handImbalance to the adjusted avg cost.
    const totalKeys  = leftKeys + rightKeys;
    const imbalance  = totalKeys > 0
        ? Math.abs(leftKeys - rightKeys) / totalKeys   // 0.0 – 1.0
        : 0;
    const balancePenalty = imbalance * W.handImbalance;

    const score = Math.min(100, Math.round((adjusted + balancePenalty) / SCORE_MAX * 100));

    // Window-smoothed per-character coloring
    const WINDOW   = 4;
    const segments = [];
    let   seg      = null;

    for (let i = 0; i < n; i++) {
        let sum = 0, cnt = 0;
        for (let j = Math.max(0, i - WINDOW); j <= Math.min(n - 1, i + WINDOW); j++) {
            sum += costs[j]; cnt++;
        }
        const level = (sum / cnt) < SEG_EASY   ? 'easy'
                    : (sum / cnt) < SEG_MEDIUM  ? 'medium'
                    : 'hard';

        if (!seg || seg.level !== level) {
            seg = { start: i, end: i, level };
            segments.push(seg);
        } else {
            seg.end = i;
        }
    }

    return { score, avg: +avg.toFixed(3), length: n, chars, segments,
             handBalance: { left: leftKeys, right: rightKeys, imbalance: +imbalance.toFixed(3) } };
};