let cleanupCursor = null;

const HOVER_SELECTOR = [
  'a',
  'button',
  '.service-card',
  '.card-hover',
  '[role="button"]',
  '[data-cursor-hover]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'summary'
].join(',');

const NATIVE_CURSOR_SELECTOR = [
  "input:not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio']):not([type='color']):not([type='file']):not([type='range'])",
  'textarea',
  'select',
  "[contenteditable='true']",
  "[contenteditable='']",
  "[contenteditable='plaintext-only']",
  ':disabled',
  "[aria-disabled='true']",
  '.resize-handle',
  '.pdf-resize-handle',
  '.drag-handle',
  '[data-resize-handle]',
  '[data-drag-handle]'
].join(',');

function shouldUseCustomCursor() {
  if (typeof window === 'undefined') return false;
  if (!window.matchMedia) return false;
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

  const cores = window.navigator.hardwareConcurrency || 4;
  const memory = window.navigator.deviceMemory || 4;
  return cores > 2 && memory > 2;
}

function createCursorLayer(className) {
  const layer = document.createElement('div');
  layer.className = className;
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  return layer;
}

export function initCustomCursor() {
  if (cleanupCursor) return cleanupCursor;
  if (!shouldUseCustomCursor()) return () => {};

  const cursor = createCursorLayer('custom-cursor');
  const trails = [0, 1, 2].map((index) => createCursorLayer(`custom-cursor-trail custom-cursor-trail-${index + 1}`));
  const html = document.documentElement;

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let isVisible = false;
  let isHovering = false;
  let isNativeTarget = false;
  let rafId = 0;

  const trailState = trails.map(() => ({ x: targetX, y: targetY }));

  function setPosition(element, x, y) {
    element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function updateHoverState(nextHovering) {
    if (isHovering === nextHovering) return;
    isHovering = nextHovering;
    cursor.classList.toggle('is-hovering', isHovering);
  }

  function isNativeCursorTarget(target) {
    return Boolean(target?.closest?.(NATIVE_CURSOR_SELECTOR));
  }

  function updateTargetState(target) {
    const nextNativeTarget = isNativeCursorTarget(target);
    if (isNativeTarget !== nextNativeTarget) {
      isNativeTarget = nextNativeTarget;
      cursor.classList.toggle('is-native-target', isNativeTarget);
      trails.forEach((trail) => trail.classList.toggle('is-native-target', isNativeTarget));
    }
    updateHoverState(!isNativeTarget && Boolean(target?.closest?.(HOVER_SELECTOR)));
  }

  function animate() {
    currentX += (targetX - currentX) * 0.15;
    currentY += (targetY - currentY) * 0.15;
    setPosition(cursor, currentX, currentY);

    trailState.forEach((trail, index) => {
      const ease = 0.09 - index * 0.015;
      trail.x += (targetX - trail.x) * ease;
      trail.y += (targetY - trail.y) * ease;
      setPosition(trails[index], trail.x, trail.y);
    });

    rafId = window.requestAnimationFrame(animate);
  }

  function handlePointerMove(event) {
    targetX = event.clientX;
    targetY = event.clientY;

    if (!isVisible) {
      isVisible = true;
      currentX = targetX;
      currentY = targetY;
      trailState.forEach((trail) => {
        trail.x = targetX;
        trail.y = targetY;
      });
      html.classList.add('custom-cursor-ready');
    }

    updateTargetState(event.target);
  }

  function handlePointerOver(event) {
    updateTargetState(event.target);
  }

  function handlePointerOut(event) {
    if (!event.relatedTarget) {
      html.classList.remove('custom-cursor-ready');
      isVisible = false;
    }
    updateTargetState(event.relatedTarget);
  }

  function handlePointerDown(event) {
    if (isNativeTarget || isNativeCursorTarget(event.target)) return;

    cursor.classList.add('is-clicking');

    const ripple = document.createElement('div');
    ripple.className = 'custom-cursor-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    document.body.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  function handlePointerUp() {
    cursor.classList.remove('is-clicking');
  }

  html.classList.add('custom-cursor-enabled');
  document.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.addEventListener('pointerover', handlePointerOver, { passive: true });
  document.addEventListener('pointerout', handlePointerOut, { passive: true });
  document.addEventListener('pointerdown', handlePointerDown, { passive: true });
  document.addEventListener('pointerup', handlePointerUp, { passive: true });
  rafId = window.requestAnimationFrame(animate);

  cleanupCursor = () => {
    window.cancelAnimationFrame(rafId);
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerover', handlePointerOver);
    document.removeEventListener('pointerout', handlePointerOut);
    document.removeEventListener('pointerdown', handlePointerDown);
    document.removeEventListener('pointerup', handlePointerUp);
    html.classList.remove('custom-cursor-enabled', 'custom-cursor-ready');
    cursor.remove();
    trails.forEach((trail) => trail.remove());
    document.querySelectorAll('.custom-cursor-ripple').forEach((ripple) => ripple.remove());
    cleanupCursor = null;
  };

  return cleanupCursor;
}
