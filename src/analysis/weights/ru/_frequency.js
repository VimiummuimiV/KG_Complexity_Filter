// ─── Russian letter frequency ─────────────────────────────────────────────────
// Language-level data — shared by all RU layouts (ЙЦУКЕН, ДИКТОР, …).
// Used to penalise rare letters (weaker muscle memory).

export const frequency = {
    'о':10.98, 'е':8.48, 'а':8.00, 'и':7.37, 'н':6.70, 'т':6.32, 'с':5.47,
    'р':4.75, 'в':4.53, 'л':4.34, 'к':3.49, 'м':3.20, 'д':2.98, 'п':2.80,
    'у':2.62, 'я':2.00, 'ы':1.90, 'з':1.64, 'ч':1.45, 'й':1.21, 'б':1.59,
    'г':1.69, 'ь':1.74, 'ж':0.94, 'х':0.97, 'ш':0.72, 'ю':0.64, 'ц':0.49,
    'щ':0.36, 'э':0.33, 'ф':0.27, 'ъ':0.04, 'ё':0.01,
};

export const freqNorm = 10.98; // о — most frequent Russian letter
export const layoutLang = 'RU';