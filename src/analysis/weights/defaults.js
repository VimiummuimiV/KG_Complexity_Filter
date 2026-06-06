// Shared defaults used by weight configs and complexity analysis.

export const defaultWeights = {
    row:             { 2:0, 1:1.0, 3:1.5, 0:2.5 },
    finger:          [2.0, 1.5, 1.0, 0.5, 0.7,  0.7, 0.5, 1.0, 1.5, 2.0],
    freqMax:         1.0,
    digit:           1.5,
    unknown:         3.5,
    shiftHold:       3.0,
    rhythmBreak:     1.5,
    sameFinger:      3.0,
    sameHand:        0.8,
    rowJump:         0.6,
    outwardRoll:     0.5,
    colJump:         0.15,
    scissor:         0.8,
    handRunBase:     4,
    handRunStep:     0.12,
    handImbalance:   0.6,
    capsLockAt:      4,
    wordLengthBase:  8,
    wordLengthStep:  0.1,
    wordLengthMax:   2.0,

    // Trigram redirect: penalty when a same-hand trigram reverses direction
    redirect:         0.6,
    // Shift alternation: reward / extra penalty for same-side Shift hold
    shiftAltBonus:    0.3,   // subtracted when shift hand ≠ key hand (good)
    shiftAltPenalty:  0.4,   // added when shift hand === key hand (bad)
    // Punctuation cluster: extra cost per consecutive rhythm-break char beyond the first
    punctClusterStep: 0.3,
    // Per-finger fatigue: after fatigueBase presses on one finger, cost escalates
    fatigueBase:      12,
    fatigueStep:      0.08,
};

export const defaultScoreMax  = 9.0;
export const defaultVarWeight = 0.25;
export const defaultSegEasy   = 3.0;
export const defaultSegMedium = 5.5;