import { getGameId, fetchGameText } from './api/gameText.js';
import { analyzeComplexity } from './analysis/complexity.js';
import { render } from './ui/ui.js';

const gameId = getGameId();

if (gameId) {
    fetchGameText(gameId)
        .then(text => {
            if (!text) {
                console.warn('[KG] no text in response');
                return;
            }

            const result = analyzeComplexity(text);
            if (!result) {
                console.warn('[KG] complexity analysis returned null');
                return;
            }

            render(result);
        })
        .catch(e => console.error('[KG] error ->', e.message));
}