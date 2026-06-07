export const makeDraggable = (element, handle = element, storageKey) => {
  let active    = false;
  let offsetX   = 0;
  let offsetY   = 0;
  let intendedX = null;
  let intendedY = null;

  const constrain = () => {
    const r  = element.getBoundingClientRect();
    const mL = window.innerWidth  - r.width;
    const mT = window.innerHeight - r.height;
    if (r.left < 0)  element.style.left = '0px';
    if (r.top  < 0)  element.style.top  = '0px';
    if (r.left > mL) element.style.left = mL + 'px';
    if (r.top  > mT) element.style.top  = mT + 'px';
  };

  const place = (x, y) => {
    intendedX = x;
    intendedY = y;
    element.style.left = x + 'px';
    element.style.top  = y + 'px';
    constrain();
  };

  // Restore saved position
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top))
      place(saved.left, saved.top);
  } catch {}

  const save = () => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ left: intendedX ?? element.offsetLeft, top: intendedY ?? element.offsetTop })); }
    catch {}
  };

  const onResize = () => {
    if (intendedX !== null) element.style.left = intendedX + 'px';
    if (intendedY !== null) element.style.top  = intendedY + 'px';
    constrain();
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
  window.addEventListener('resize', onResize);

  return () => {
    handle.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('resize', onResize);
  };
};