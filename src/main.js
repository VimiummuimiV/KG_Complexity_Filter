import { getGameId, fetchGameText } from './api/gameText.js';
import { analyzeComplexity, nextLang } from './analysis/complexity.js';
import { render } from './ui/ui.js';
import { getVocLayout, setVocLayout } from './helpers/vocLayout.js';
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

            const onLangChange = (currentLang) => {
                const lang   = nextLang(currentLang);
                const result = analyzeComplexity(text, lang);
                if (!result) { notify(null, getStrings().alertLangIncompatible, 'error'); return; }
                if (vocId) setVocLayout(vocId, lang);
                render(result, vocId, onLangChange);
            };

            const savedLang = vocId ? getVocLayout(vocId) : null;
            const result    = analyzeComplexity(text, savedLang);
            if (!result) {
                console.warn('[KG] complexity analysis returned null');
                return;
            }
            render(result, vocId, onLangChange);
        })
        .catch(e => console.error('[KG] error ->', e.message));
}