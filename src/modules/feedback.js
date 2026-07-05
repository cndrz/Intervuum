import { h, escapeHtml, uid, formatDate } from './dom.js';
import { chatJSON } from './groq.js';
import { buildFeedbackPrompt } from './prompts.js';
import { addHistoryEntry } from './storage.js';

const METRICS = [
  { key: 'communication', label: 'Communication' },
  { key: 'technicalKnowledge', label: 'Technical knowledge' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'clarity', label: 'Clarity' }
];

export async function renderFeedback(root, { navigate }, { session, profile }) {
  root.innerHTML = '';
  root.appendChild(loadingView());

  let report;
  try {
    const messages = buildFeedbackPrompt({
      name: profile.name,
      role: session.role,
      transcript: session.transcript,
      questionLimit: session.questionLimit
    });
    report = await chatJSON(messages, { temperature: 0.4, max_tokens: 900 });
    report = normalizeReport(report);
  } catch (err) {
    root.innerHTML = '';
    root.appendChild(errorView(err.message, () => renderFeedback(root, { navigate }, { session, profile })));
    return;
  }

  const entry = {
    id: uid(),
    role: session.role,
    questionLimit: session.questionLimit,
    startedAt: session.startedAt,
    finishedAt: new Date().toISOString(),
    transcript: session.transcript,
    report
  };
  addHistoryEntry(entry);

  root.innerHTML = '';
  root.appendChild(reportView(entry, { navigate }));
}

function loadingView() {
  return h('div', { class: 'center-view' }, [
    h('div', { style: 'text-align:center' }, [
      h('div', { class: 'typing-dots', style: 'margin:0 auto 18px;display:inline-flex' }, [h('span'), h('span'), h('span')]),
      h('h2', { style: 'font-size:16px;margin-bottom:6px' }, 'Scoring your interview'),
      h('p', { style: 'color:var(--muted);font-size:13px' }, 'Reviewing your answers for communication, depth, and clarity…')
    ])
  ]);
}

function errorView(message, retry) {
  return h('div', { class: 'center-view' }, [
    h('div', { class: 'card', style: 'max-width:440px;text-align:center' }, [
      h('div', { class: 'eyebrow', style: 'justify-content:center' }, 'Something went wrong'),
      h('h1', { style: 'font-size:20px' }, "Couldn't generate feedback"),
      h('p', { class: 'lede', style: 'margin:10px auto 22px' }, message),
      h('button', { class: 'btn btn-primary', onClick: retry }, 'Try again')
    ])
  ]);
}

function normalizeReport(raw) {
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  return {
    overallScore: clamp(raw.overallScore),
    communication: clamp(raw.communication),
    technicalKnowledge: clamp(raw.technicalKnowledge),
    confidence: clamp(raw.confidence),
    clarity: clamp(raw.clarity),
    summary: String(raw.summary || '').trim(),
    strengths: toList(raw.strengths),
    weaknesses: toList(raw.weaknesses),
    tips: toList(raw.tips)
  };
}

function toList(val) {
  if (Array.isArray(val)) return val.map(String).filter(Boolean).slice(0, 6);
  if (typeof val === 'string' && val.trim()) return [val.trim()];
  return [];
}

export function reportView(entry, { navigate }) {
  const { report } = entry;
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (report.overallScore / 100) * circumference;

  const scoreRing = h('div', {
    class: 'score-ring',
    html: `<svg width="112" height="112" viewBox="0 0 112 112">
      <circle class="track" cx="56" cy="56" r="48"></circle>
      <circle class="fill" cx="56" cy="56" r="48" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"></circle>
    </svg>
    <div class="score-num"><strong>${report.overallScore}</strong><span>OVERALL</span></div>`
  });

  const metricGrid = h('div', { class: 'metric-grid' }, METRICS.map((m) =>
    h('div', { class: 'metric-card' }, [
      h('div', { class: 'metric-top' }, [
        h('span', { class: 'metric-label' }, m.label),
        h('span', { class: 'metric-val' }, `${report[m.key]}`)
      ]),
      h('div', { class: 'meter' }, [
        h('div', { class: 'meter-fill', style: `width:0%`, 'data-target': report[m.key] })
      ])
    ])
  ));

  const strengthsSection = report.strengths.length ? h('div', { class: 'report-section' }, [
    h('h3', {}, 'Strengths'),
    h('div', { class: 'tag-list' }, report.strengths.map((s, i) =>
      h('div', { class: 'tag-item strength' }, [h('span', { class: 'idx' }, `0${i + 1}`), h('span', {}, s)])
    ))
  ]) : null;

  const weaknessesSection = report.weaknesses.length ? h('div', { class: 'report-section' }, [
    h('h3', {}, 'Weak spots'),
    h('div', { class: 'tag-list' }, report.weaknesses.map((s, i) =>
      h('div', { class: 'tag-item weakness' }, [h('span', { class: 'idx' }, `0${i + 1}`), h('span', {}, s)])
    ))
  ]) : null;

  const tipsSection = report.tips.length ? h('div', { class: 'report-section' }, [
    h('h3', {}, 'Do this next time'),
    h('div', { class: 'tag-list' }, report.tips.map((s, i) =>
      h('div', { class: 'tag-item tip' }, [h('span', { class: 'idx' }, `0${i + 1}`), h('span', {}, s)])
    ))
  ]) : null;

  const transcriptDetails = h('details', { class: 'transcript-toggle' }, [
    h('summary', {}, `Full transcript (${entry.transcript.length} messages)`),
    h('div', { class: 'transcript-list' }, entry.transcript.map((m) =>
      h('div', { class: `msg-row ${m.role === 'assistant' ? 'ai' : 'user'}` }, [
        h('div', { class: `avatar ${m.role === 'assistant' ? 'ai' : 'user'}` }, m.role === 'assistant' ? 'IV' : '••'),
        h('div', { class: 'bubble', html: escapeHtml(m.content).replace(/\n/g, '<br>') })
      ])
    ))
  ]);

  const view = h('div', { class: 'feedback-view' }, [
    h('div', { class: 'feedback-inner' }, [
      h('div', { class: 'eyebrow' }, `${entry.role} · ${formatDate(entry.finishedAt)}`),
      h('div', { class: 'score-hero' }, [
        scoreRing,
        h('div', { class: 'score-hero-text' }, [
          h('h2', {}, scoreLabel(report.overallScore)),
          h('p', {}, report.summary || 'Feedback generated from your rapid-fire session.')
        ])
      ]),
      metricGrid,
      strengthsSection,
      weaknessesSection,
      tipsSection,
      transcriptDetails,
      h('div', { class: 'feedback-actions' }, [
        h('button', { class: 'btn btn-primary', onClick: () => navigate('setup') }, 'New interview'),
        h('button', { class: 'btn btn-ghost', onClick: () => navigate('history') }, 'View all history')
      ])
    ])
  ]);

  // animate after mount
  requestAnimationFrame(() => {
    const fillCircle = view.querySelector('.score-ring .fill');
    if (fillCircle) fillCircle.style.strokeDashoffset = String(offset);
    view.querySelectorAll('.meter-fill').forEach((el) => {
      el.style.width = el.dataset.target + '%';
    });
  });

  return view;
}

function scoreLabel(score) {
  if (score >= 85) return 'Strong performance';
  if (score >= 70) return 'Solid, with room to sharpen';
  if (score >= 50) return 'A working foundation';
  return 'Needs focused practice';
}
