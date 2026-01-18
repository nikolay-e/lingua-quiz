export type LanguageCode = 'en-US' | 'fr-FR' | 'es-ES' | 'de-DE';

export interface PronunciationScores {
  accuracy: number;
  fluency: number;
  completeness: number;
  prosody: number;
  pronunciation: number;
}

export type ErrorType = 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';

export interface PhonemeAssessment {
  phoneme: string;
  score: number;
  expected: string;
  actual?: string;
}

export interface WordAssessment {
  word: string;
  accuracyScore: number;
  errorType: ErrorType;
  phonemes: PhonemeAssessment[];
}

export interface PhonemeError {
  phoneme: string;
  expected: string;
  actual: string;
  score: number;
}

export interface Attempt {
  id: string;
  text: string;
  timestamp: string;
  scores: PronunciationScores;
  passed: boolean;
}

export interface AssessmentResult {
  scores: PronunciationScores;
  phonemeErrors: PhonemeError[];
  wordAssessments: WordAssessment[];
  recognizedText: string;
}

export interface AssessmentFeedback {
  passed: boolean;
  message: string;
  suggestion?: string;
}
