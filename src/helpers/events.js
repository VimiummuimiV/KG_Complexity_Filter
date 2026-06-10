// ─── helpers/events.js ───────────────────────────────────────────────────────
// Delegated blink-free hover. One listener pair on parent, timer shared across
// all matching children. mouseover/mouseout bubble up from any depth.
// The leave is debounced: moving between siblings cancels the pending clear
// before it fires, so the attribute is never absent between adjacent targets.

export const onHoverDelegate = (parent, selector, onEnter, onLeave, delay = 300) => {
    let timer;
    parent.addEventListener('mouseover', (e) => {
        const target = e.target.closest(selector);
        if (!target || !parent.contains(target)) return;
        clearTimeout(timer);
        onEnter(target, e);
    });
    parent.addEventListener('mouseout', (e) => {
        const target = e.target.closest(selector);
        if (!target || !parent.contains(target)) return;
        if (target.contains(e.relatedTarget)) return;
        timer = setTimeout(() => onLeave(target, e), delay);
    });
};