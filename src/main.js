import { getGameId, fetchGameText } from './api/gameText.js';
import { analyzeComplexity, detectLang, nextLang, nextLayout } from './analysis/complexity.js';
import { render } from './ui/ui.js';
import { getVocLang, setVocLang, getLayout, setLayout } from './helpers/keyboardConfig.js';
import { notify } from './helpers/notification.js';
import { getStrings } from './helpers/lang.js';

const gameId = getGameId();

if (gameId) {
    fetchGameText(gameId)
        .then(({ text, vocId }) => {
            if (!text) {
                console.warn('[KG] no text in response');
                return;
            }

            const applyResult = (layoutLang, layoutName) => {
                const result = analyzeComplexity(text, layoutLang, layoutName);
                if (!result) { notify(null, getStrings().alertLangIncompatible, 'error'); return; }
                if (vocId) setVocLang(vocId, result.layoutLang);
                setLayout(result.layoutLang, result.layoutName);
                render(result, vocId, onLangChange, onLayoutChange);
            };

            const onLangChange   = (currentLayoutLang)                          => { const layoutLang = nextLang(currentLayoutLang); applyResult(layoutLang, getLayout(layoutLang)); };
            const onLayoutChange = (currentLayoutLang, currentLayoutName) => applyResult(currentLayoutLang, nextLayout(currentLayoutLang, currentLayoutName));

            const savedLayoutLang = vocId ? getVocLang(vocId) : null;
            const layoutLang      = savedLayoutLang ?? detectLang(text);
            const layoutName      = getLayout(layoutLang);
            const result          = analyzeComplexity(text, layoutLang, layoutName);
            if (!result) {
                console.warn('[KG] complexity analysis returned null');
                return;
            }
            render(result, vocId, onLangChange, onLayoutChange);
        })
        .catch(e => console.error('[KG] error ->', e.message));
}