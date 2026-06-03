export const makeDraggable = (element, handle = element, storageKey) => {
  let active = false;
  let offsetX = 0;
  let offsetY = 0;

  const place = (left, top) => {
    element.style.left   = `${Math.min(Math.max(left, 0), window.innerWidth  - element.offsetWidth)}px`;
    element.style.top    = `${Math.min(Math.max(top,  0), window.innerHeight - element.offsetHeight)}px`;
  };

  // Restore saved position
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top))
      place(saved.left, saved.top);
  } catch {}

  const save = () => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ left: element.offsetLeft, top: element.offsetTop })); }
    catch {}
  };

  const onPointerMove = (e) => {
    if (!active) return;
    e.preventDefault();
    place(e.clientX - offsetX, e.clientY - offsetY);
  };

  const onPointerUp = () => {
    active = false;
    save();
    window.removeEventListener('pointermove', onPointerMove);
  };

  const onPointerDown = (e) => {
    if (e.button) return;
    if (e.target.closest('button, [role="button"], a, input, textarea, select')) return;
    e.preventDefault();

    const rect = element.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    active  = true;
    place(rect.left, rect.top);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
  };

  handle.addEventListener('pointerdown', onPointerDown);

  return () => {
    handle.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };
};