import { getGameId, fetchGameText } from './api/gameText.js';

const gameId = getGameId();

if (gameId) {
    fetchGameText(gameId)
        .then(text => {
            if (text) console.log('[KG] text ->', text);
            else console.warn('[KG] no text in response');
        })
        .catch(e => console.error('[KG] error ->', e.message));
}