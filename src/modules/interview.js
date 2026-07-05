import { h, escapeHtml, uid } from './dom.js';
import { icons } from './icons.js';
import { chatStream } from './groq.js';
import { buildSystemPrompt } from './prompts.js';
import { getProfile } from './storage.js';
import { createRecognizer, sttSupported } from './voice.js';
import { toast } from './toast.js';

export function renderInterview(root, { navigate }, params) {
  root.innerHTML = '';
  const profile = getProfile();
  const { role, questionLimit } = params;

  const systemPrompt = buildSystemPrompt({
    name: profile.name,
    gender: profile.gender,
    role,
    questionLimit
  });

  const session = {
    id: uid(),
    role,
    questionLimit,
    startedAt: new Date().toISOString(),
    apiMessages: [{ role: 'system', content: systemPrompt }],
    transcript: [],
    questionCount: 0,
    ended: false
  };

  let busy = false;
  let listening = false;
  let recognizer = null;

  // ---- header ----
  const qCounter = h('div', { class: 'q-counter' }, `0 / ${questionLimit}`);
  const pulseFill = h('div', { class: 'pulse-fill' });

  const header = h('div', { class: 'interview-header' }, [
    h('div', { class: 'interview-meta' }, [
      h('div', { class: 'role-name' }, role),
      h('div', { class: 'role-tag' }, `RAPID-FIRE · ${profile.name.toUpperCase()}`)
    ]),
    h('div', { class: 'topbar-actions' }, [
      qCounter
    ])
  ]);

  const pulseStrip = h('div', { class: 'pulse-strip' }, [pulseFill]);

  // ---- chat area ----
  const chatInner = h('div', { class: 'chat-inner' });
  const chatScroll = h('div', { class: 'chat-scroll' }, [chatInner]);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatScroll.scrollTop = chatScroll.scrollHeight;
    });
  }

  function addBubble(roleType, text) {
    const row = h('div', { class: `msg-row ${roleType}` }, [
      roleType !== 'system' ? h('div', { class: `avatar ${roleType === 'assistant' ? 'ai' : 'user'}` }, roleType === 'assistant' ? 'IV' : initials(profile.name)) : null,
      h('div', { class: 'bubble', html: escapeHtml(text).replace(/\n/g, '<br>') })
    ]);
    chatInner.appendChild(row);
    scrollToBottom();
    return row;
  }

  let typingRow = null;
  function showTyping() {
    typingRow = h('div', { class: 'msg-row ai typing-row' }, [
      h('div', { class: 'avatar ai' }, 'IV'),
      h('div', { class: 'typing-dots' }, [h('span'), h('span'), h('span')])
    ]);
    chatInner.appendChild(typingRow);
    scrollToBottom();
  }
  function hideTyping() {
    typingRow?.remove();
    typingRow = null;
  }

  function initials(name) {
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  // ---- composer ----
  const textarea = h('textarea', {
    rows: '1',
    placeholder: 'Type your answer…',
    onInput: () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
      sendBtn.disabled = !textarea.value.trim() || busy;
    },
    onKeydown: (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitAnswer();
      }
    }
  });

  const sendBtn = h('button', {
    type: 'button',
    class: 'composer-btn send',
    'aria-label': 'Send answer',
    disabled: true,
    html: icons.send,
    onClick: () => submitAnswer()
  });

  const micBtn = h('button', {
    type: 'button',
    class: 'composer-btn mic',
    'aria-label': 'Voice input',
    html: icons.mic,
    onClick: () => (listening ? stopListening() : startListening())
  });

  const composer = h('div', { class: 'composer' }, [
    textarea,
    sttSupported ? micBtn : null,
    sendBtn
  ]);

  const hint = h('div', { class: 'composer-hint' }, [
    h('span', {}, 'Enter to send · Shift+Enter for a new line'),
    h('span', {}, `${role}`)
  ]);

  const endEarly = h('div', { class: 'end-early' }, [
    h('button', { type: 'button', onClick: () => endInterview() }, 'End interview now and get feedback')
  ]);

  const composerWrap = h('div', { class: 'composer-wrap' }, [composer, hint, endEarly]);

  root.appendChild(h('div', { class: 'interview-view' }, [
    header,
    pulseStrip,
    chatScroll,
    composerWrap
  ]));

  // ---- dictation ----
  function startListening() {
    if (!sttSupported || listening || busy) return;
    recognizer = createRecognizer({
      onStart: () => {
        listening = true;
        micBtn.classList.add('listening');
        textarea.placeholder = 'Listening\u2026';
      },
      onResult: ({ interim, final }) => {
        textarea.value = (final + interim).trim();
      },
      onEnd: (finalTranscript) => {
        listening = false;
        micBtn.classList.remove('listening');
        textarea.placeholder = 'Type your answer\u2026';
        if (finalTranscript.trim()) {
          textarea.value = finalTranscript.trim();
          sendBtn.disabled = false;
        }
      },
      onError: (error) => {
        listening = false;
        micBtn.classList.remove('listening');
        textarea.placeholder = 'Type your answer\u2026';
        if (error === 'not-allowed') {
          toast('Microphone access denied. Check your browser settings.', 'error');
        } else if (error === 'no-speech') {
          toast('No speech detected, try again', 'warning');
        }
      }
    });
    try {
      recognizer?.start();
    } catch {
      listening = false;
      micBtn.classList.remove('listening');
      toast('Unable to start voice input. Try clicking the mic button.', 'info');
    }
  }

  function stopListening() {
    recognizer?.stop();
    recognizer = null;
    listening = false;
    micBtn.classList.remove('listening');
  }

  // ---- flow ----
  function setBusy(val) {
    busy = val;
    sendBtn.disabled = val || !textarea.value.trim();
    textarea.disabled = val;
  }

  function updateProgress() {
    qCounter.textContent = `${session.questionCount} / ${session.questionLimit}`;
    const pct = Math.min(100, Math.round((session.questionCount / session.questionLimit) * 100));
    pulseFill.style.setProperty('--pct', pct + '%');
  }

  async function askNextQuestion() {
    setBusy(true);
    hideTyping();
    try {
      const bubbleRow = addBubble('ai', '');
      const bubbleEl = bubbleRow.querySelector('.bubble');
      let fullReply = '';

      let latest = '';
      let flushTimer = null;

      function flushText() {
        flushTimer = null;
        bubbleEl.innerHTML = escapeHtml(latest).replace(/\n/g, '<br>');
        requestAnimationFrame(() => { chatScroll.scrollTop = chatScroll.scrollHeight; });
      }

      await new Promise((resolve, reject) => {
        chatStream(session.apiMessages, { temperature: 0.8, max_tokens: 220 }, {
          onToken: (_token, fullText) => {
            latest = fullText;
            if (!flushTimer) flushTimer = setTimeout(flushText, 80);
          },
          onDone: (text) => {
            fullReply = text.trim();
            latest = fullReply;
            if (flushTimer) {
              const wait = () => {
                if (flushTimer) return setTimeout(wait, 10);
                resolve();
              };
              wait();
            } else {
              flushText();
              resolve();
            }
          },
          onError: (err) => {
            if (flushTimer) clearTimeout(flushTimer);
            reject(err);
          }
        });
      });

      session.apiMessages.push({ role: 'assistant', content: fullReply });
      session.transcript.push({ role: 'assistant', content: fullReply });
      session.questionCount += 1;
      updateProgress();
    } catch (err) {
      const lastAiRow = chatInner.querySelector('.msg-row.ai:last-child .bubble');
      if (lastAiRow && !lastAiRow.textContent.trim()) {
        lastAiRow.closest('.msg-row')?.remove();
      }
      addBubble('system', `Connection hiccup: ${err.message}. Check your setup and try again.`);
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer() {
    const text = textarea.value.trim();
    if (!text || busy) return;
    textarea.value = '';
    textarea.style.height = 'auto';
    sendBtn.disabled = true;

    addBubble('user', text);
    session.apiMessages.push({ role: 'user', content: text });
    session.transcript.push({ role: 'user', content: text });

    if (session.questionCount >= session.questionLimit) {
      endInterview();
      return;
    }
    await askNextQuestion();
  }

  function endInterview() {
    if (session.ended) return;
    session.ended = true;
    navigate('feedback', { session, profile });
  }

  // kick off
  askNextQuestion();
}
