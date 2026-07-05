// Wraps the browser's Speech-to-Text API (dictation only).
// Falls back silently if the browser doesn't support it.

const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;

export const sttSupported = Boolean(SpeechRecognitionImpl);

export function createRecognizer({ onResult, onEnd, onError, onStart }) {
  if (!sttSupported) return null;

  const recognizer = new SpeechRecognitionImpl();
  recognizer.continuous = false;
  recognizer.interimResults = true;
  recognizer.lang = 'en-US';

  let finalTranscript = '';

  recognizer.onstart = () => {
    finalTranscript = '';
    onStart?.();
  };

  recognizer.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += transcript;
      else interim += transcript;
    }
    onResult?.({ final: finalTranscript, interim });
  };

  recognizer.onerror = (event) => {
    onError?.(event.error);
  };

  recognizer.onend = () => {
    onEnd?.(finalTranscript);
  };

  return recognizer;
}
