// Shared defaults used by weight configs and complexity analysis.
// Each value is the fallback used when a layout config does not override it.

export const defaultWeights = {
    row:             { 2:0, 1:1.0, 3:1.5, 0:2.5 }, // row penalty: index=home row, 0=top, 3=bottom
    finger:          [2.0, 1.5, 1.0, 0.5, 0.7,  0.7, 0.5, 1.0, 1.5, 2.0], // finger effort: thumb..pinky
    freqMax:         1.0,  // max extra cost for a very rare character
    digit:           1.5,  // additional cost for digit-row keys
    unknown:         3.5,  // cost for characters not found in the layout
    shiftHold:       3.0,  // extra cost when shift is held while pressing another key
    rhythmBreak:     1.5,  // penalty for punctuation/symbols that break flow
    sameFinger:      3.0,  // penalty when two consecutive chars use the same finger
    sameHand:        0.8,  // base penalty when two chars use the same hand
    rowJump:         0.6,  // penalty per row of vertical distance in a bigram
    outwardRoll:     0.5,  // penalty for motion away from the index finger
    colJump:         0.15, // penalty per column distance for same-hand bigrams
    scissor:         0.8,  // penalty for awkward adjacent-finger, multi-row bigrams
    handRunBase:     4,    // sustained same-hand run length before escalation begins
    handRunStep:     0.12, // additional cost per char beyond handRunBase
    handImbalance:   0.6,  // max penalty applied for fully one-sided hand usage
    capsLockAt:      4,    // consecutive shifted chars before assuming Caps Lock
    wordLengthBase:  8,    // words up to this length get no length penalty
    wordLengthStep:  0.1,  // multiplier increase per char beyond wordLengthBase
    wordLengthMax:   2.0,  // multiplier ceiling (a 22-char word gets ×2.0 at step 0.1 from base 8)
};

export const defaultScoreMax  = 9.0;  // normalization factor used to convert adjusted average to a 0-100 score
export const defaultVarWeight = 0.25; // weight for the standard deviation penalty in adjusted average
export const defaultSegEasy   = 3.0;  // segment cost threshold for easy/green coloring
export const defaultSegMedium = 5.5;  // segment cost threshold for medium/yellow coloring