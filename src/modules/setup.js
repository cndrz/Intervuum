import { h } from './dom.js';
import { ROLE_CATEGORIES, QUESTION_COUNTS } from './prompts.js';
import { getProfile } from './storage.js';

export function renderSetup(root, { navigate }) {
  root.innerHTML = '';
  const profile = getProfile();

  let selectedRole = null;
  let selectedRoleLabel = '';
  let customMode = false;
  let questionLimit = 8;

  const roleCards = ROLE_CATEGORIES.map((role) => {
    const card = h('button', {
      type: 'button',
      class: 'role-card',
      onClick: () => selectRole(role.id, role.title, card)
    }, [
      h('div', { class: 'role-title' }, role.title),
      h('div', { class: 'role-sub' }, role.sub)
    ]);
    return card;
  });

  const customInput = h('input', {
    type: 'text',
    placeholder: 'e.g. DevRel Engineer, Growth Marketer…',
    maxlength: '60',
    onInput: () => {
      selectedRole = 'custom';
      selectedRoleLabel = customInput.value.trim();
      updateStartState();
    }
  });

  const customToggle = h('button', {
    type: 'button',
    class: 'pill',
    onClick: () => {
      customMode = !customMode;
      customToggle.classList.toggle('active', customMode);
      customField.style.display = customMode ? 'block' : 'none';
      if (customMode) {
        roleCards.forEach((c) => c.classList.remove('active'));
        selectedRole = 'custom';
        selectedRoleLabel = customInput.value.trim();
        customInput.focus();
      } else {
        selectedRole = null;
        selectedRoleLabel = '';
      }
      updateStartState();
    }
  }, '+ Custom role');

  const customField = h('div', { class: 'field', style: 'display:none;margin-top:10px' }, [customInput]);

  function selectRole(id, label, cardEl) {
    selectedRole = id;
    selectedRoleLabel = label;
    customMode = false;
    customField.style.display = 'none';
    customToggle.classList.remove('active');
    roleCards.forEach((c) => c.classList.remove('active'));
    cardEl.classList.add('active');
    updateStartState();
  }

  const countPills = QUESTION_COUNTS.map((n) => {
    const pill = h('button', {
      type: 'button',
      class: `pill${n === questionLimit ? ' active red' : ''}`,
      onClick: () => {
        questionLimit = n;
        countPills.forEach((p) => p.classList.remove('active', 'red'));
        pill.classList.add('active', 'red');
      }
    }, `${n} questions`);
    return pill;
  });

  const startBtn = h('button', {
    class: 'btn btn-primary',
    type: 'submit',
    disabled: true
  }, 'Start interview');

  function updateStartState() {
    startBtn.disabled = !selectedRole || !selectedRoleLabel;
  }

  const form = h('form', {
    onSubmit: (e) => {
      e.preventDefault();
      if (!selectedRoleLabel) return;
      navigate('interview', { role: selectedRoleLabel, questionLimit });
    }
  }, [
    h('div', { class: 'field' }, [
      h('label', {}, 'Choose a role'),
      h('div', { class: 'role-grid' }, roleCards),
      customToggle,
      customField
    ]),
    h('div', { class: 'field' }, [
      h('label', {}, 'Interview length'),
      h('div', { class: 'pill-group' }, countPills)
    ]),
    h('div', { class: 'form-actions' }, [
      h('button', {
        type: 'button',
        class: 'btn btn-ghost',
        onClick: () => navigate('history')
      }, 'View history'),
      startBtn
    ])
  ]);

  const card = h('div', { class: 'card' }, [
    h('div', { class: 'eyebrow' }, 'New interview'),
    h('h1', {}, profile?.name ? `Ready when you are, ${firstName(profile.name)}` : 'Set up your interview'),
    h('p', { class: 'lede' }, 'Pick a role and a length. Questions adapt to your answers in real time — one at a time, rapid-fire.'),
    form
  ]);

  root.appendChild(h('div', { class: 'center-view' }, [
    h('div', { class: 'shell-inner', style: 'max-width:640px' }, [card])
  ]));
}

function firstName(full) {
  return full.trim().split(/\s+/)[0];
}
