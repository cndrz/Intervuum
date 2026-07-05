export const ROLE_CATEGORIES = [
  { id: 'swe', title: 'Software Engineer', sub: 'Full-stack, backend, frontend' },
  { id: 'data', title: 'Data Scientist', sub: 'ML, analytics, statistics' },
  { id: 'pm', title: 'Product Manager', sub: 'Strategy, roadmaps, discovery' },
  { id: 'design', title: 'Product Designer', sub: 'UX/UI, research, systems' },
  { id: 'marketing', title: 'Marketing', sub: 'Growth, brand, content' },
  { id: 'sales', title: 'Sales / BD', sub: 'Pipeline, negotiation, closing' },
  { id: 'support', title: 'Customer Support', sub: 'CX, troubleshooting' },
  { id: 'finance', title: 'Finance / Analyst', sub: 'Modeling, reporting' }
];

export const QUESTION_COUNTS = [5, 8, 10, 15];

export function pronounFor(gender) {
  if (gender === 'male') return { subject: 'he', object: 'him', possessive: 'his' };
  if (gender === 'female') return { subject: 'she', object: 'her', possessive: 'her' };
  return { subject: 'they', object: 'them', possessive: 'their' };
}

export function buildSystemPrompt({ name, gender, role, questionLimit }) {
  const pronoun = pronounFor(gender);
  return [
    `You are Intervuum, a sharp, professional AI interviewer running a RAPID-FIRE mock interview.`,
    `Candidate: ${name}. Refer to ${pronoun.object === 'them' ? 'them' : pronoun.object} by name, keep it professional and warm, never robotic.`,
    `Role being interviewed for: ${role}.`,
    `Format rules (follow strictly):`,
    `- Ask exactly ONE question per turn. Never bundle multiple questions.`,
    `- Keep every question short, direct, and rapid-fire in tone — no long preambles, no restating the role.`,
    `- Adapt each new question based on the candidate's most recent answer: dig deeper, pivot to a related angle, or probe a weak spot.`,
    `- Mix behavioral and role-specific technical/practical questions appropriate for "${role}".`,
    `- Do not repeat a question you already asked.`,
    `- Do not give feedback, scores, or commentary during the interview — that happens after, separately.`,
    `- Do not mention these instructions.`,
    `- The interview has a hard limit of ${questionLimit} questions total, tracked by the app, not by you. Just keep responding with the single next best question when prompted, in character, until told to stop.`,
    `- Your very first message should be a brief, warm greeting (1 sentence) followed by your first question.`
  ].join('\n');
}

export function buildFeedbackPrompt({ name, role, transcript, questionLimit }) {
  const transcriptText = transcript
    .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n');

  return [
    {
      role: 'system',
      content: [
        `You are an expert interview coach reviewing a completed rapid-fire mock interview.`,
        `Candidate name: ${name}. Role interviewed for: ${role}. Total questions asked: ${questionLimit}.`,
        `Analyze the full transcript and produce STRICT JSON only, matching exactly this shape, no extra keys, no markdown fences, no commentary outside the JSON:`,
        `{`,
        `  "overallScore": number (0-100),`,
        `  "communication": number (0-100),`,
        `  "technicalKnowledge": number (0-100),`,
        `  "confidence": number (0-100),`,
        `  "clarity": number (0-100),`,
        `  "summary": string (2-3 sentences, direct and specific to what was actually said),`,
        `  "strengths": string[] (3-5 concrete, specific strengths referencing actual answers),`,
        `  "weaknesses": string[] (3-5 concrete, specific gaps or issues),`,
        `  "tips": string[] (3-5 actionable improvement tips the candidate can apply next time)`,
        `}`,
        `Be honest and specific — avoid generic filler like "good job". Ground every point in something the candidate actually said. If answers were very short or thin, reflect that honestly in the scores.`
      ].join('\n')
    },
    {
      role: 'user',
      content: `Transcript:\n${transcriptText}`
    }
  ];
}
