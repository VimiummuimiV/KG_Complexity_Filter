// ─── weights/weightsIndex.js ─────────────────────────────────────────────────────────
// Auto-discovers all layout configs from weights/<lang>/<layout>.js via webpack
// require.context. Each module must export: layout, shiftMap, freq, lang, layoutName.
// Shared defaults (weights, scoreMax, etc.) are merged in from complexity.js.

import { defaultWeights, defaultScoreMax, defaultVarWeight, defaultSegEasy, defaultSegMedium } from './defaults.js';

// Collect every .js file two levels deep: weights/<lang>/<layout>.js
const ctx = require.context('.', true, /^\.\/[^/]+\/[^/]+\.js$/);

export const configs = ctx.keys().map(key => {
    const mod = ctx(key);
    return {
        weights:   defaultWeights,
        scoreMax:  defaultScoreMax,
        varWeight: defaultVarWeight,
        segEasy:   defaultSegEasy,
        segMedium: defaultSegMedium,
        ...mod,
    };
});