import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DEFAULT_MARGIN = 12;
const DEFAULT_GAP = 8;
const DEFAULT_WIDTH = 216;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function calculateMenuPosition(trigger, menu, width, gap, margin) {
  if (!trigger || typeof window === 'undefined') return null;
  const triggerRect = trigger.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const availableWidth = Math.max(0, viewportWidth - margin * 2);
  const menuWidth = Math.min(width || menu?.offsetWidth || DEFAULT_WIDTH, availableWidth || DEFAULT_WIDTH);
  const menuHeight = menu?.offsetHeight || 1;
  const spaceBelow = viewportHeight - triggerRect.bottom - margin;
  const spaceAbove = triggerRect.top - margin;
  const opensBelow = spaceBelow >= menuHeight || spaceBelow >= spaceAbove;
  const rawTop = opensBelow ? triggerRect.bottom + gap : triggerRect.top - menuHeight - gap;
  const rawLeft = triggerRect.right - menuWidth;

  return {
    top: clamp(rawTop, margin, viewportHeight - menuHeight - margin),
    left: clamp(rawLeft, margin, viewportWidth - menuWidth - margin),
    width: menuWidth,
    placement: opensBelow ? 'bottom' : 'top'
  };
}

export function FloatingRowActionMenu({
  open,
  triggerElement,
  onClose,
  className = '',
  width = DEFAULT_WIDTH,
  gap = DEFAULT_GAP,
  margin = DEFAULT_MARGIN,
  children,
  role = 'menu'
}) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    if (!open || !triggerElement) {
      setPosition(null);
      return;
    }
    setPosition(calculateMenuPosition(triggerElement, menuRef.current, width, gap, margin));
  }, [gap, margin, open, triggerElement, width]);

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsideClick(event) {
      if (menuRef.current?.contains(event.target)) return;
      if (triggerElement?.contains(event.target)) return;
      onClose();
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose, open, triggerElement]);

  if (!open || !triggerElement || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`${className} floating-row-action-menu is-portal ${position ? `is-${position.placement}` : ''}`.trim()}
      role={role}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      style={{
        position: 'fixed',
        top: position ? `${position.top}px` : 0,
        left: position ? `${position.left}px` : 0,
        width: position ? `${position.width}px` : `${width}px`,
        maxWidth: `calc(100vw - ${margin * 2}px)`,
        maxHeight: `calc(100vh - ${margin * 2}px)`,
        overflowY: 'auto',
        visibility: position ? 'visible' : 'hidden',
        zIndex: 10000
      }}
    >
      {children}
    </div>,
    document.body
  );
}
