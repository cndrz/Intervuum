import { h, formatDate } from './dom.js';
import { getHistory, getHistoryEntry, clearHistory } from './storage.js';
import { confirm } from './dialog.js';
import { reportView } from './feedback.js';

export function renderHistory(root, { navigate }) {
  root.innerHTML = '';
  const entries = getHistory();

  const list = entries.length
    ? h('div', { class: 'history-list' }, entries.map((entry) =>
        h('button', {
          type: 'button',
          class: 'history-item',
          onClick: () => navigate('history-detail', { id: entry.id })
        }, [
          h('div', { class: 'history-item-main' }, [
            h('div', { class: 'history-item-role' }, entry.role),
            h('div', { class: 'history-item-date' }, `${formatDate(entry.finishedAt)} · ${entry.questionLimit} questions`)
          ]),
          h('div', { class: 'history-score' }, `${entry.report.overallScore}`)
        ])
      ))
    : h('div', { class: 'empty-state' }, [
        h('div', { class: 'icon' }, '◎'),
        h('p', {}, "No interviews yet — your sessions and scores will show up here."),
        h('button', { class: 'btn btn-primary', onClick: () => navigate('setup') }, 'Start your first interview')
      ]);

  const clearBtn = entries.length
    ? h('button', {
        class: 'btn btn-ghost',
        onClick: async () => {
          if (await confirm('Clear all history?', "All past interview sessions and scores will be permanently removed.")) {
            clearHistory();
            renderHistory(root, { navigate });
          }
        }
      }, 'Clear history')
    : null;

  root.appendChild(h('div', { class: 'history-view' }, [
    h('div', { class: 'history-inner' }, [
      h('div', { class: 'history-header' }, [
        h('div', {}, [
          h('div', { class: 'eyebrow' }, 'Your sessions'),
          h('h1', { style: 'font-size:22px' }, 'Interview history')
        ]),
        clearBtn
      ]),
      list
    ])
  ]));
}

export function renderHistoryDetail(root, { navigate }, { id }) {
  root.innerHTML = '';
  const entry = getHistoryEntry(id);

  if (!entry) {
    root.appendChild(h('div', { class: 'center-view' }, [
      h('div', { class: 'card', style: 'text-align:center;max-width:420px' }, [
        h('h1', { style: 'font-size:18px' }, 'Session not found'),
        h('p', { class: 'lede' }, "This interview may have been cleared from history."),
        h('button', { class: 'btn btn-primary', onClick: () => navigate('history') }, 'Back to history')
      ])
    ]));
    return;
  }

  const backBar = h('div', { style: 'padding:16px 24px 0;max-width:760px;margin:0 auto;width:100%' }, [
    h('button', { class: 'icon-btn', onClick: () => navigate('history') }, [
      h('span', {}, '← Back to history')
    ])
  ]);

  root.appendChild(h('div', { style: 'flex:1;display:flex;flex-direction:column' }, [
    backBar,
    reportView(entry, { navigate })
  ]));
}
