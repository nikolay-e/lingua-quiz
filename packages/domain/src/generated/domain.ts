// Auto-generated from JSON Schemas. Do not edit manually.
export interface ContentVersion {
  versionId: number;
  versionName: string;
  isActive: boolean;
}


export interface ProgressUpdate {
  vocabularyItemId: string;
  level: number;
  queuePosition: number;
  correctCount: number;
  incorrectCount: number;
}


export interface TtsLanguages {
  available: boolean;
  supportedLanguages: string[];
}


export interface TtsRequest {
  text: string;
  language: string;
}


export interface TtsResponse {
  audioData: string;
  contentType?: string;
  text: string;
  language: string;
}


export interface User {
  id: number;
  username: string;
  is_admin?: boolean;
}


export interface UserProgress {
  vocabularyItemId: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  level: number;
  queuePosition: number;
  correctCount: number;
  incorrectCount: number;
  consecutiveCorrect: number;
  lastPracticed: string | null;
}


export interface VocabularyItem {
  id: string;
  sourceText: string;
  sourceLanguage: string;
  targetText: string;
  targetLanguage: string;
  listName: string;
  sourceUsageExample: string | null;
  targetUsageExample: string | null;
}


export interface WordList {
  listName: string;
  wordCount: number;
}

