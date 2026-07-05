// Groq inference client.
//
// In production this calls /api/groq — a Vercel serverless function that
// holds GROQ_API_KEY server-side (see api/groq.js). For quick local
// prototyping without `vercel dev`, set VITE_GROQ_API_KEY_DEV_ONLY in a
// local .env and this module will call Groq directly from the browser
// instead (never do this in a deployed build — the key would be public).

const DEV_KEY = import.meta.env.VITE_GROQ_API_KEY_DEV_ONLY;
const DEV_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const PROXY_ENDPOINT = '/api/groq';

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

async function callGroq({ messages, model = DEFAULT_MODEL, temperature = 0.7, response_format, max_tokens = 1024 }) {
  const useDev = Boolean(DEV_KEY);
  const endpoint = useDev ? DEV_ENDPOINT : PROXY_ENDPOINT;

  const body = { messages, model, temperature, max_tokens };
  if (response_format) body.response_format = response_format;

  const headers = { 'Content-Type': 'application/json' };
  if (useDev) headers.Authorization = `Bearer ${DEV_KEY}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!res.ok) {
    const message = data?.error?.message || data?.error || 'The interviewer is unreachable right now.';
    throw new Error(message);
  }

  return data;
}

/**
 * Send a chat-style conversation and get back the assistant's reply text.
 */
export async function chat(messages, opts = {}) {
  const data = await callGroq({ messages, ...opts });
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Streaming variant — calls onToken(token, fullText) for every content
 * delta as it arrives, then onDone(fullText) when the stream completes.
 * Works through both the Vercel proxy and the dev direct-API path.
 */
export async function chatStream(messages, opts = {}, { onToken, onDone, onError }) {
  const useDev = Boolean(DEV_KEY);
  const endpoint = useDev ? DEV_ENDPOINT : PROXY_ENDPOINT;
  const headers = { 'Content-Type': 'application/json' };
  if (useDev) headers.Authorization = `Bearer ${DEV_KEY}`;

  const body = { messages, model: DEFAULT_MODEL, ...opts, stream: true };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data?.error?.message || data?.error || 'The interviewer is unreachable right now.';
      onError?.(new Error(message));
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const token = parsed?.choices?.[0]?.delta?.content || '';
            if (token) {
              fullText += token;
              onToken?.(token, fullText);
            }
          } catch {
            // skip malformed JSON chunks
          }
        }
      }
    }

    onDone?.(fullText);
  } catch (err) {
    onError?.(err);
  }
}

/**
 * Ask Groq for strict JSON and parse it, tolerating markdown code fences
 * or stray preamble text that some models add despite instructions.
 */
export async function chatJSON(messages, opts = {}) {
  const text = await chat(messages, {
    ...opts,
    response_format: { type: 'json_object' }
  });

  return safeParseJSON(text);
}

export function safeParseJSON(text) {
  if (!text) throw new Error('Empty response from model');
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const slice = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;
  try {
    return JSON.parse(slice);
  } catch (err) {
    throw new Error('Could not parse the model\'s JSON response');
  }
}
