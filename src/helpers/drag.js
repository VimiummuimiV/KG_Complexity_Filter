export const makeDraggable = (element, handle = element, storageKey) => {
  let active = false;
  let offsetX = 0;
  let offsetY = 0;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const point = ({ clientX: x, clientY: y }) => ({ x, y });
  const apply = ({ left, top }) => {
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
  };

  const saved = storageKey && (() => {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || 'null');
    } catch {
      return null;
    }
  })();

  if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
    apply(saved);
  }

  const save = () => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ left: element.offsetLeft, top: element.offsetTop })
      );
    } catch {}
  };

  const update = ({ x, y }) => apply({
    left: clamp(x - offsetX, 0, window.innerWidth - element.offsetWidth),
    top: clamp(y - offsetY, 0, window.innerHeight - element.offsetHeight),
  });

  const onPointerMove = (event) => {
    if (!active) return;
    event.preventDefault();
    update(point(event));
  };

  const onPointerUp = () => {
    active = false;
    save();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  const onPointerDown = (event) => {
    if (event.button) return;
    if (event.target.closest('button, [role="button"], a, input, textarea, select')) return;
    event.preventDefault();

    const rect = element.getBoundingClientRect();
    const pos = point(event);

    offsetX = pos.x - rect.left;
    offsetY = pos.y - rect.top;
    active = true;
    apply(rect);

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
