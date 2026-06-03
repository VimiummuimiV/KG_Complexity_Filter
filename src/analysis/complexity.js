// ─── Finger / Row / Hand mapping ────────────────────────────────────────────
// finger: 0=L-pinky  1=L-ring  2=L-middle  3=L-index  4=L-index-stretch
//         5=R-index-stretch  6=R-index  7=R-middle  8=R-ring  9=R-pinky
// row:    0=digit  1=top  2=home  3=bottom

const LAYOUT = {
    // ── digit row ──────────────────────────────────────────────────────────
    '1':[0,0,'L'], '2':[1,0,'L'], '3':[2,0,'L'], '4':[3,0,'L'], '5':[4,0,'L'],
    '6':[5,0,'R'], '7':[6,0,'R'], '8':[7,0,'R'], '9':[8,0,'R'], '0':[9,0,'R'],

    // ── top row  й ц у к е н г ш щ з х ъ ──────────────────────────────────
    'й':[0,1,'L'], 'ц':[1,1,'L'], 'у':[2,1,'L'], 'к':[3,1,'L'], 'е':[4,1,'L'],
    'н':[5,1,'R'], 'г':[6,1,'R'], 'ш':[7,1,'R'], 'щ':[8,1,'R'],
    'з':[9,1,'R'], 'х':[9,1,'R'], 'ъ':[9,1,'R'],

    // ── home row  ф ы в а п р о л д ж э ───────────────────────────────────
    'ф':[0,2,'L'], 'ы':[1,2,'L'], 'в':[2,2,'L'], 'а':[3,2,'L'], 'п':[4,2,'L'],
    'р':[5,2,'R'], 'о':[6,2,'R'], 'л':[7,2,'R'], 'д':[8,2,'R'],
    'ж':[9,2,'R'], 'э':[9,2,'R'],

    // ── bottom row  я ч с м и т ь б ю ─────────────────────────────────────
    'я':[0,3,'L'], 'ч':[1,3,'L'], 'с':[2,3,'L'], 'м':[3,3,'L'], 'и':[4,3,'L'],
    'т':[5,3,'R'], 'ь':[6,3,'R'], 'б':[7,3,'R'], 'ю':[8,3,'R'],
    ',':[8,3,'R'], '.':[9,3,'R'],
};

// Uppercase / shift → base key
const SHIFT_MAP = {
    'Й':'й','Ц':'ц','У':'у','К':'к','Е':'е','Н':'н','Г':'г','Ш':'ш',
    'Щ':'щ','З':'з','Х':'х','Ъ':'ъ',
    'Ф':'ф','Ы':'ы','В':'в','А':'а','П':'п','Р':'р','О':'о','Л':'л',
    'Д':'д','Ж':'ж','Э':'э',
    'Я':'я','Ч':'ч','С':'с','М':'м','И':'и','Т':'т','Ь':'ь','Б':'б','Ю':'ю',
    '!':'1','"':'2','№':'3',';':'4','%':'5',':':'6','?':'7','*':'8',
    '(':'9',')':'0','<':',','>':'.',
};

// ─── Russian letter frequency (approx %, top letters easier) ───────────────
// Lower frequency → slightly higher cost (rarer = more surprising to type)
const FREQ_RU = {
    'о':10.97,'е':8.45,'а':7.99,'и':7.37,'н':6.70,'т':6.26,'с':5.47,'р':4.73,
    'в':4.54,'л':4.34,'к':3.49,'м':3.21,'д':2.98,'п':2.81,'у':2.62,'я':2.01,
    'ы':1.90,'ь':1.74,'г':1.72,'з':1.65,'б':1.59,'ч':1.44,'й':1.21,'х':0.97,
    'ж':0.94,'ш':0.73,'ю':0.64,'ц':0.48,'щ':0.36,'э':0.32,'ф':0.26,'ъ':0.04,
};

// ─── Penalty weights ────────────────────────────────────────────────────────
const W = {
    row:    { 2:0, 1:1.0, 3:1.5, 0:2.5 },
    finger: [2.0,1.5,1.0,0.5,0.7, 0.7,0.5,1.0,1.5,2.0],
    shift:       1.5,
    unknown:     3.0,
    freqMax:     0.8,   // extra cost added for letters with <1 % frequency
    sameFinger:  3.0,
    sameHand:    0.8,
    rowJump:     0.6,   // per row of distance
    outwardRoll: 0.5,
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const resolve = (ch) => {
    const shifted = SHIFT_MAP[ch];
    return shifted ? { key: LAYOUT[shifted], isShift: true }
                   : { key: LAYOUT[ch],      isShift: false };
};

const charCost = (ch) => {
    if (ch === ' ' || ch === '\n' || ch === '\r') return 0.2;   // spacebar / enter — easy
    const { key, isShift } = resolve(ch);
    if (!key) return W.unknown;

    const [finger, row] = key;
    const base = ch.toLowerCase ? FREQ_RU[ch.toLowerCase()] : undefined;
    const freqPenalty = base !== undefined ? W.freqMax * (1 - base / 11) : W.freqMax;

    return W.row[row] + W.finger[finger] + (isShift ? W.shift : 0) + freqPenalty;
};

const bigramCost = (a, b) => {
    const ra = resolve(a); const rb = resolve(b);
    if (!ra.key || !rb.key) return 0;
    const [fa, rowa, ha] = ra.key;
    const [fb, rowb, hb] = rb.key;

    let cost = 0;
    if (fa === fb)       cost += W.sameFinger;
    else if (ha === hb)  cost += W.sameHand;

    cost += Math.abs(rowa - rowb) * W.rowJump;

    // Outward roll penalty
    if (ha === hb) {
        if (ha === 'L' && fb < fa) cost += W.outwardRoll;
        if (ha === 'R' && fb > fa) cost += W.outwardRoll;
    }
    return cost;
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Analyse the typing complexity of `text`.
 *
 * Returns {
 *   score   : 0-100  overall difficulty
 *   avg     : raw average cost per character
 *   length  : character count
 *   perChar : Float32Array of per-character raw costs  (same length as [...text])
 *   segments: Array of { start, end, level }  where level = 'easy'|'medium'|'hard'
 * }
 */
export const analyzeComplexity = (text) => {
    if (!text?.length) return null;

    const chars   = [...text];
    const n       = chars.length;
    const costs   = new Float32Array(n);

    let total = 0;
    for (let i = 0; i < n; i++) {
        const c = charCost(chars[i]) + (i > 0 ? bigramCost(chars[i - 1], chars[i]) : 0);
        costs[i] = c;
        total   += c;
    }

    const avg = total / n;
    // Practical range: ~0.2 (spaces) – ~10+ (rare shifted digit-row chars back-to-back)
    const MAX = 10;
    const score = Math.min(100, Math.round((avg / MAX) * 100));

    // Build segments for coloring (window of 4 chars smoothed)
    const WINDOW  = 4;
    const segments = [];
    let   seg      = null;

    for (let i = 0; i < n; i++) {
        // local average over a small window
        let sum = 0, cnt = 0;
        for (let j = Math.max(0, i - WINDOW); j <= Math.min(n - 1, i + WINDOW); j++) {
            sum += costs[j]; cnt++;
        }
        const local = sum / cnt;
        const level = local < 2.0 ? 'easy' : local < 4.0 ? 'medium' : 'hard';

        if (!seg || seg.level !== level) {
            seg = { start: i, end: i, level };
            segments.push(seg);
        } else {
            seg.end = i;
        }
    }

    return { score, avg: +avg.toFixed(3), length: n, perChar: costs, segments, chars };
};