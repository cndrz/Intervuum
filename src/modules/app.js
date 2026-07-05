import { h } from './dom.js';
import { icons } from './icons.js';
import { getProfile, resetProfile } from './storage.js';
import { confirm } from './dialog.js';
import { renderOnboarding } from './onboarding.js';
import { renderSetup } from './setup.js';
import { renderInterview } from './interview.js';
import { renderFeedback } from './feedback.js';
import { renderHistory, renderHistoryDetail } from './history.js';

const NAV_HIDDEN_VIEWS = new Set(['interview']);

export function mountApp(root) {
  let currentView = getProfile() ? 'setup' : 'onboarding';
  let currentParams = {};

  const topbar = h('div', { class: 'topbar' }, [
    h('button', {
      type: 'button',
      class: 'wordmark',
      onClick: () => navigate(getProfile() ? 'setup' : 'onboarding')
    }, [
      h('span', { class: 'dot' }),
      'INTERVUUM',
      h('small', {}, 'RAPID-FIRE INTERVIEWS')
    ]),
    h('div', { class: 'topbar-actions' }, [
      h('button', {
        type: 'button',
        class: 'icon-btn',
        'aria-label': 'History',
        html: `${icons.history}<span class="icon-btn-label"> History</span>`,
        onClick: () => navigate('history')
      }),
      h('button', {
        type: 'button',
        class: 'icon-btn',
        'aria-label': 'Edit profile',
        html: `${icons.settings}<span class="icon-btn-label"> Edit profile</span>`,
        onClick: async () => {
          if (await confirm("Update your profile?", "You'll go through onboarding again to set your name and gender.")) {
            resetProfile();
            navigate('onboarding');
          }
        }
      })
    ])
  ]);

  const viewport = h('main', { class: 'view' });

  root.appendChild(topbar);
  root.appendChild(viewport);

  function navigate(view, params = {}) {
    currentView = view;
    currentParams = params;
    topbar.style.display = NAV_HIDDEN_VIEWS.has(view) ? 'none' : 'flex';
    renderCurrent();
    window.scrollTo(0, 0);
  }

  function renderCurrent() {
    const ctx = { navigate };
    switch (currentView) {
      case 'onboarding':
        renderOnboarding(viewport, ctx);
        break;
      case 'setup':
        if (!getProfile()) return navigate('onboarding');
        renderSetup(viewport, ctx);
        break;
      case 'interview':
        renderInterview(viewport, ctx, currentParams);
        break;
      case 'feedback':
        renderFeedback(viewport, ctx, currentParams);
        break;
      case 'history':
        renderHistory(viewport, ctx);
        break;
      case 'history-detail':
        renderHistoryDetail(viewport, ctx, currentParams);
        break;
      default:
        renderSetup(viewport, ctx);
    }
  }

  topbar.style.display = NAV_HIDDEN_VIEWS.has(currentView) ? 'none' : 'flex';
  renderCurrent();
}
