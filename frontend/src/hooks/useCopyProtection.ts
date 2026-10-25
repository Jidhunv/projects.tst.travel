import { useEffect } from 'react';
import '../styles/copyProtection.css';

// Keys that save, print or view the page source on a protected page.
const BLOCKED_SHORTCUTS = new Set(['s', 'p', 'u']);

const isFormField = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

// Blocks copying of page content on a protected page, using standard DOM events
// that behave the same in Chrome, Edge, Firefox and Safari. Inside a form field
// the user can still type, select and paste, but copy and cut are blocked. A
// browser cannot stop a screenshot or a determined user; the watermark identifies
// anyone who takes one.
export function useCopyProtection(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    // Everywhere on the page: copy, cut, selection, right-click menu and dragging are blocked.
    // Inside a form field only copy and cut are blocked.
    const block = (e: Event) => {
      if (isFormField(e.target) && e.type !== 'copy' && e.type !== 'cut' && e.type !== 'contextmenu') return;
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        // Overwrite the clipboard the OS just filled with the screen.
        navigator.clipboard?.writeText('').catch(() => undefined);
        e.preventDefault();
        return;
      }
      const key = e.key.toLowerCase();
      if (!(e.ctrlKey || e.metaKey)) return;
      if (BLOCKED_SHORTCUTS.has(key)) {
        e.preventDefault();
        return;
      }
      // Copy and cut are blocked everywhere; select-all is blocked outside form fields.
      if (key === 'c' || key === 'x' || (key === 'a' && !isFormField(e.target))) {
        e.preventDefault();
      }
    };

    const events: Array<keyof DocumentEventMap> = ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'];
    events.forEach((type) => document.addEventListener(type, block));
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('copy-protected');

    return () => {
      events.forEach((type) => document.removeEventListener(type, block));
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('copy-protected');
    };
  }, [enabled]);
}
