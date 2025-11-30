import { createFocusTrap } from 'focus-trap';

export function focusTrap(node: HTMLElement) {
  const trap = createFocusTrap(node, {
    escapeDeactivates: true,
    allowOutsideClick: true,
    initialFocus: node.querySelector('[data-autofocus]') as HTMLElement | undefined,
    fallbackFocus: node,
  });

  trap.activate();

  return {
    destroy() {
      trap.deactivate();
    },
  };
}
