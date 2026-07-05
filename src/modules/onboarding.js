import { h } from './dom.js';
import { saveProfile } from './storage.js';

export function renderOnboarding(root, { navigate }) {
  root.innerHTML = '';

  let selectedGender = null;

  const genderPills = h('div', { class: 'pill-group', role: 'radiogroup', 'aria-label': 'Gender' }, [
    genderPill('female', 'Female'),
    genderPill('male', 'Male'),
    genderPill('other', 'Other / Prefer not to say')
  ]);

  function genderPill(value, label) {
    const btn = h('button', {
      type: 'button',
      class: 'pill',
      'aria-pressed': 'false',
      onClick: () => {
        selectedGender = value;
        [...genderPills.children].forEach((c) => {
          c.classList.remove('active', 'red');
          c.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active', 'red');
        btn.setAttribute('aria-pressed', 'true');
        submitBtn.disabled = !nameInput.value.trim() || !selectedGender;
      }
    }, label);
    return btn;
  }

  const nameInput = h('input', {
    type: 'text',
    id: 'name',
    placeholder: 'e.g. Jose Reyes',
    autocomplete: 'name',
    maxlength: '60',
    onInput: () => {
      submitBtn.disabled = !nameInput.value.trim() || !selectedGender;
    }
  });

  const submitBtn = h('button', {
    class: 'btn btn-primary btn-block',
    type: 'submit',
    disabled: true
  }, 'Continue');

  const form = h('form', {
    onSubmit: (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      if (!name || !selectedGender) return;
      saveProfile({ name, gender: selectedGender });
      navigate('setup');
    }
  }, [
    h('div', { class: 'field' }, [
      h('label', { for: 'name' }, "What's your name?"),
      nameInput
    ]),
    h('div', { class: 'field' }, [
      h('label', {}, 'How should the AI refer to you?'),
      genderPills,
      h('p', { class: 'gender-note' }, 'Used only to phrase questions naturally (e.g. pronouns). Stored on this device only.')
    ]),
    h('div', { class: 'form-actions' }, [
      h('span'),
      submitBtn
    ])
  ]);

  const card = h('div', { class: 'card' }, [
    h('div', { class: 'eyebrow' }, 'Welcome to Intervuum'),
    h('h1', {}, "Let's get you set up"),
    h('p', { class: 'lede' }, 'A couple of quick details so your rapid-fire interview feels personal from the first question.'),
    form
  ]);

  root.appendChild(h('div', { class: 'center-view' }, [
    h('div', { class: 'shell-inner', style: 'max-width:480px' }, [card])
  ]));

  nameInput.focus();
}
