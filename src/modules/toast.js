import { h } from './dom.js';
import { icons } from './icons.js';

const ICONS = {
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
};

const DEFAULT_DURATION = 4000;
let container = null;

function getContainer() {
  if (!container) {
    container = h('div', { class: 'toast-container' });
    document.getElementById('app').appendChild(container);
  }
  return container;
}

export function toast(message, type = 'info', duration = DEFAULT_DURATION) {
  const c = getContainer();

  function dismiss() {
    el.classList.add('toast-leaving');
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 250);
  }

  const el = h('div', { class: `toast toast-${type}` }, [
    h('span', { class: 'toast-icon', html: ICONS[type] || ICONS.info }),
    h('span', { class: 'toast-msg' }, message),
    h('button', {
      class: 'toast-close',
      html: icons.x,
      onClick: dismiss
    })
  ]);

  c.appendChild(el);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return { dismiss, el };
}

export function dismissAll() {
  if (!container) return;
  const toasts = [...container.querySelectorAll('.toast')];
  toasts.forEach(t => {
    t.classList.add('toast-leaving');
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 250);
  });
}
