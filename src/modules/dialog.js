import { h } from './dom.js';

let activeDialog = null;

export function confirm(message, description = '') {
  if (activeDialog) return Promise.resolve(false);

  return new Promise((resolve) => {
    const overlay = h('div', { class: 'dialog-overlay' });
    const card = h('div', { class: 'dialog-card' }, [
      h('div', { class: 'dialog-body' }, [
        h('p', { class: 'dialog-msg' }, message),
        description ? h('p', { class: 'dialog-desc' }, description) : null
      ]),
      h('div', { class: 'dialog-actions' }, [
        h('button', {
          type: 'button',
          class: 'btn btn-ghost',
          onClick: () => done(false)
        }, 'Cancel'),
        h('button', {
          type: 'button',
          class: 'btn btn-primary dialog-confirm-btn',
          onClick: () => done(true)
        }, 'Confirm')
      ])
    ]);

    overlay.appendChild(card);
    document.getElementById('app').appendChild(overlay);

    const confirmBtn = card.querySelector('.dialog-confirm-btn');
    confirmBtn.focus();

    let settled = false;

    function done(value) {
      if (settled) return;
      settled = true;
      activeDialog = null;
      overlay.classList.add('dialog-leaving');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
      resolve(value);
    }

    function onKey(e) {
      if (e.key === 'Escape') done(false);
      if (e.key === 'Enter') done(true);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) done(false);
    });

    document.addEventListener('keydown', onKey);
    activeDialog = { cleanup: () => done(false) };
  });
}
