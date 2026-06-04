// ─── ЙЦУКЕН layout config ────────────────────────────────────────────────────
//
// finger: 0=L-pinky  1=L-ring  2=L-middle  3=L-index  4=L-index-stretch
//         5=R-index-stretch  6=R-index  7=R-middle  8=R-ring  9=R-pinky
// row:    0=digit  1=top  2=home  3=bottom

export const layout = {
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
export const shiftMap = {
    // ── digit row: shift+key ───────────────────────────────────────────────
    '!':'1', '"':'2', '№':'3', ';':'4', '%':'5',
    ':':'6', '?':'7', '*':'8', '(':'9', ')':'0',
    '_':'-', '+':'=',

    // ── bottom row: shift+key ──────────────────────────────────────────────
    ',':'.', '\\':'/',
};

// Letter frequency in Russian text (approx %)
// Used to penalise rare letters (weaker muscle memory)
export const freq = {
    'о':10.97,'е':8.45,'а':7.99,'и':7.37,'н':6.70,'т':6.26,'с':5.47,'р':4.73,
    'в':4.54,'л':4.34,'к':3.49,'м':3.21,'д':2.98,'п':2.81,'у':2.62,'я':2.01,
    'ы':1.90,'ь':1.74,'г':1.72,'з':1.65,'б':1.59,'ч':1.44,'й':1.21,'х':0.97,
    'ж':0.94,'ш':0.73,'ю':0.64,'ц':0.48,'щ':0.36,'э':0.32,'ф':0.26,'ъ':0.04,
};

// Scaling constants — calibrated against real Russian text samples:
//   plain prose     → adj ~3.2  → score ~36
//   rare words      → adj ~3.5  → score ~39
//   heavy punct     → adj ~4.9  → score ~54
//   dense digits    → adj ~6.6  → score ~73
//   pure symbols    → adj ~8.0  → score ~89
export const scoreMax  = 9.0;
export const varWeight = 0.25;  // stddev contribution to adjusted avg

// Segment coloring thresholds (windowed per-char cost)
export const segEasy   = 3.0;   // green
export const segMedium = 5.5;   // yellow; above → red

// Penalty weights
export const weights = {
    row:          { 2:0, 1:1.0, 3:1.5, 0:2.5 },
    finger:       [2.0, 1.5, 1.0, 0.5, 0.7,  0.7, 0.5, 1.0, 1.5, 2.0],
    freqMax:      1.0,   // max surcharge for rare letters
    digit:        1.5,   // extra reach cost for digit-row keys
    unknown:      3.5,   // chars not in layout at all
    shiftHold:    3.0,   // pinky held for shift while pressing another key
    rhythmBreak:  1.5,   // non-alphanumeric chars break flow
    sameFinger:   3.0,   // bigram: same finger used twice in a row
    sameHand:     0.8,   // bigram: same hand used twice in a row
    rowJump:      0.6,   // bigram: per row of vertical distance
    outwardRoll:  0.5,   // bigram: finger moving away from index
    colJump:      0.15,  // bigram: lateral distance between fingers (same hand)
    scissor:      0.8,   // bigram: adjacent fingers spanning ≥2 rows
    handRunBase:  4,     // same-hand streak length before escalation kicks in
    handRunStep:  0.12,  // extra cost per char beyond that threshold
    handImbalance:0.6,   // max penalty when entire text is on one hand
    capsLockAt:   4,     // consecutive capitals before assuming Caps Lock
};
export const lang       = 'ru';
export const layoutName = 'ЙЦУКЕН';