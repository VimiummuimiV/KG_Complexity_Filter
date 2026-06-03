export const makeDraggable = (element, handle = element) => {
  let active = false;
  let offsetX = 0;
  let offsetY = 0;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const getPosition = (event) => ({
    x: event.clientX,
    y: event.clientY,
  });

  const updatePosition = ({ x, y }) => {
    element.style.left = `${clamp(x - offsetX, 0, window.innerWidth - element.offsetWidth)}px`;
    element.style.top = `${clamp(y - offsetY, 0, window.innerHeight - element.offsetHeight)}px`;
  };

  const onPointerMove = (event) => {
    if (!active) return;
    event.preventDefault();
    updatePosition(getPosition(event));
  };

  const onPointerUp = () => {
    active = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  const onPointerDown = (event) => {
    if (event.button && event.button !== 0) return;
    if (event.target.closest('button, [role="button"], a, input, textarea, select')) return;
    event.preventDefault();

    const rect = element.getBoundingClientRect();
    const pos = getPosition(event);

    offsetX = pos.x - rect.left;
    offsetY = pos.y - rect.top;
    active = true;

    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';

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
