let cleanupCursor = null;

const HOVER_SELECTOR = [
  'a',
  'button',
  '.service-card',
  '.card-hover',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="switch"]',
  '[aria-haspopup]',
  '[data-radix-collection-item]',
  '[data-cursor-hover]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'select',
  'summary'
].join(',');

const NATIVE_CURSOR_SELECTOR = [
  'input:not([type])',
  "input[type='text']",
  "input[type='search']",
  "input[type='email']",
  "input[type='password']",
  "input[type='tel']",
  "input[type='url']",
  "input[type='number']",
  'textarea',
  "[contenteditable='true']",
  "[contenteditable='']",
  "[contenteditable='plaintext-only']"
].join(',');

const SPECIAL_NATIVE_CURSOR_SELECTOR = [
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
  const listenerOptions = { passive: true, capture: true };

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

  function resolvePointerTarget(event) {
    const pathTarget = event.composedPath?.().find((node) => node instanceof Element);
    return pathTarget || document.elementFromPoint(event.clientX, event.clientY) || event.target;
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

    updateTargetState(resolvePointerTarget(event));
  }

  function handlePointerOver(event) {
    updateTargetState(resolvePointerTarget(event));
  }

  function handlePointerOut(event) {
    if (!event.relatedTarget) {
      const insideViewport = event.clientX >= 0
        && event.clientY >= 0
        && event.clientX <= window.innerWidth
        && event.clientY <= window.innerHeight;
      if (insideViewport) {
        updateTargetState(document.elementFromPoint(event.clientX, event.clientY));
        return;
      }
      html.classList.remove('custom-cursor-ready');
      isVisible = false;
    }
    updateTargetState(event.relatedTarget);
  }

  function handlePointerDown(event) {
    const target = resolvePointerTarget(event);
    if (isNativeTarget || isNativeCursorTarget(target) || target?.closest?.(SPECIAL_NATIVE_CURSOR_SELECTOR)) return;

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
  document.addEventListener('pointermove', handlePointerMove, listenerOptions);
  document.addEventListener('pointerover', handlePointerOver, listenerOptions);
  document.addEventListener('pointerout', handlePointerOut, listenerOptions);
  document.addEventListener('pointerdown', handlePointerDown, listenerOptions);
  document.addEventListener('pointerup', handlePointerUp, listenerOptions);
  rafId = window.requestAnimationFrame(animate);

  cleanupCursor = () => {
    window.cancelAnimationFrame(rafId);
    document.removeEventListener('pointermove', handlePointerMove, listenerOptions);
    document.removeEventListener('pointerover', handlePointerOver, listenerOptions);
    document.removeEventListener('pointerout', handlePointerOut, listenerOptions);
    document.removeEventListener('pointerdown', handlePointerDown, listenerOptions);
    document.removeEventListener('pointerup', handlePointerUp, listenerOptions);
    html.classList.remove('custom-cursor-enabled', 'custom-cursor-ready');
    cursor.remove();
    trails.forEach((trail) => trail.remove());
    document.querySelectorAll('.custom-cursor-ripple').forEach((ripple) => ripple.remove());
    cleanupCursor = null;
  };

  return cleanupCursor;
}
