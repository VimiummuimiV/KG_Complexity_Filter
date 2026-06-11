// ─── English letter frequency ─────────────────────────────────────────────────
// Language-level data — shared by all EN layouts (QWERTY, DVORAK, …).
// Used to penalise rare letters (weaker muscle memory).

export const frequency = {
    'e':12.60, 't':9.37, 'a':8.34, 'o':7.70, 'i':6.71, 'n':6.80, 's':6.11,
    'h':6.11,  'r':5.68, 'l':4.24, 'd':4.14, 'c':2.73, 'u':2.85, 'm':2.53,
    'w':2.34,  'f':2.03, 'g':1.92, 'y':2.04, 'p':1.66, 'b':1.54, 'v':1.06,
    'k':0.87,  'j':0.23, 'x':0.20, 'q':0.09, 'z':0.06,
};

export const freqNorm = 12.60; // e — most frequent English letter
export const layoutLang = 'EN';
export const wordLengthBase = 8; // English words average ~4.5 chars; penalise from 8