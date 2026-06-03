export const getGameId = () => new URL(location.href).searchParams.get('gmid')
    ?? /\/g\/(?<id>\d+)/.exec(location.pathname)?.groups.id;

export const fetchGameText = async (gameId) => {
    const body = new URLSearchParams({ need_text: '1' });

    const res = await fetch(`${location.origin}/g/${gameId}.info`, { method: 'POST', body });
    const json = await res.json();

    return json.text?.text ?? null;
};