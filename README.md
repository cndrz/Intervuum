# Intervuum

Rapid-fire AI interview practice. Pick a role, answer one sharp question at a
time — by typing or by voice — and get a detailed, honest feedback report the
moment you finish.

Built with Vite + vanilla HTML/CSS/JS. No frameworks, no build-heavy UI kit —
just small, readable modules. Inference runs on Groq (`llama-3.3-70b-versatile`).

## Features

- **Onboarding** — name + how the AI should refer to you, stored locally, asked once.
- **Role setup** — 8 predefined role categories or a custom role, plus interview length (5/8/10/15 questions).
- **Adaptive rapid-fire interview** — one question at a time; each next question is generated from your actual previous answer, not a script.
- **Voice** — tap-to-talk dictation with the mic button any time.
- **Feedback report** — overall score + communication / technical knowledge / confidence / clarity breakdown, strengths, weak spots, actionable tips, and the full transcript.
- **History** — every session is saved to `localStorage`; revisit past scores and transcripts any time.

## Project structure

```
intervuum/
├── api/
│   └── groq.js          # Vercel serverless function — proxies Groq, keeps the API key server-side
├── src/
│   ├── modules/
│   │   ├── app.js        # router / top nav
│   │   ├── onboarding.js # name + gender capture
│   │   ├── setup.js      # role + question count picker
│   │   ├── interview.js  # chat orchestrator (text + voice)
│   │   ├── feedback.js   # feedback generation + report UI
│   │   ├── history.js    # past sessions list + detail view
│   │   ├── prompts.js    # role catalogue + system/feedback prompt builders
│   │   ├── groq.js       # Groq API client (calls /api/groq)
│   │   ├── voice.js      # Web Speech API dictation (STT) wrapper
│   │   ├── storage.js    # localStorage helpers
│   │   ├── dom.js        # tiny DOM-building helper (h(), etc.)
│   │   └── icons.js      # inline SVG icon set
│   ├── styles/            # base tokens, shell, forms, chat, feedback — imported by style.css
│   ├── main.js
│   └── style.css
├── index.html
├── vercel.json
└── vite.config.js
```

## Notes

- All personal data (profile, interview history) lives only in the browser's `localStorage` — nothing is sent anywhere except the transcript sent to Groq for generating questions/feedback.
- Interview and feedback prompts live in `src/modules/prompts.js` if you want to tune tone, add role categories, or change the feedback rubric.
