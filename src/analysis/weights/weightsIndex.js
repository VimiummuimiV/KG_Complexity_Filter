// ─── weights/weightsIndex.js ─────────────────────────────────────────────────────────
// Auto-discovers all layout configs from weights/<lang>/<layout>.js via webpack
// require.context. Each module must export: layout, shiftMap, layoutLang, layoutName.
// Shared defaults (weights, scoreMax, etc.) are merged in from defaults.js.
// Language-level data (frequency, freqNorm) is merged in from <lang>/_frequency.js.

import { defaultWeights, defaultScoreMax, defaultVarWeight, defaultSegEasy, defaultSegMedium } from './defaults.js';

// Collect _frequency.js files: one per language folder.
const freqCtx  = require.context('.', true, /^\.\/[^/]+\/_frequency\.js$/);
const freqByLang = {};
for (const key of freqCtx.keys()) {
    const mod = freqCtx(key);
    freqByLang[mod.layoutLang] = {
        frequency: mod.frequency,
        freqNorm: mod.freqNorm,
        wordLengthBase: mod.wordLengthBase
    };
}

// Collect layout configs — skip _-prefixed files.
const ctx = require.context('.', true, /^\.\/[^/]+\/(?!_)[^/]+\.js$/);

export const configs = ctx.keys().map(key => {
    const mod = ctx(key);
    return {
        weights:   defaultWeights,
        scoreMax:  defaultScoreMax,
        varWeight: defaultVarWeight,
        segEasy:   defaultSegEasy,
        segMedium: defaultSegMedium,
        ...freqByLang[mod.layoutLang],
        ...mod,
    };
});