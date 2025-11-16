export interface SpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface SpeechState {
  speaking: boolean;
  supported: boolean;
  voices: SpeechSynthesisVoice[];
}

const DEFAULT_RATE = 0.9;
const DEFAULT_PITCH = 1.0;
const DEFAULT_VOLUME = 1.0;

export function isSpeechSupported(): boolean {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis.getVoices();
}

export function getVoiceForLanguage(langCode: string): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  const exactMatch = voices.find((v) => v.lang === langCode);
  if (exactMatch) return exactMatch;

  const prefix = langCode.split('-')[0];
  if (!prefix) return null;
  const partialMatch = voices.find((v) => v.lang.startsWith(prefix));
  return partialMatch || null;
}

export function speak(text: string, options: SpeechOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isSpeechSupported()) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? DEFAULT_RATE;
    utterance.pitch = options.pitch ?? DEFAULT_PITCH;
    utterance.volume = options.volume ?? DEFAULT_VOLUME;

    if (options.lang) {
      utterance.lang = options.lang;
      const voice = getVoiceForLanguage(options.lang);
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(`Speech error: ${event.error}`));

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function pauseSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.pause();
  }
}

export function resumeSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.resume();
  }
}

export function isSpeaking(): boolean {
  if (!isSpeechSupported()) return false;
  return window.speechSynthesis.speaking;
}

export function createSpeechState(): SpeechState {
  return {
    speaking: false,
    supported: isSpeechSupported(),
    voices: [],
  };
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) {
      resolve([]);
      return;
    }

    const voices = getAvailableVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      resolve(getAvailableVoices());
    };

    setTimeout(() => resolve(getAvailableVoices()), 1000);
  });
}
