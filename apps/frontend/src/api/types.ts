import type {
  ContentVersionResponse,
  TTSLanguagesResponse as ApiTTSLanguagesResponse,
  TTSResponse as ApiTTSResponse,
  UserProgressResponse,
  UserResponse,
  VocabularyItemDetailResponse,
  VocabularyItemResponse,
  WordListResponse,
} from '@lingua-quiz/api-client';
import type { LucideIcon } from 'lucide-react';

export type User = UserResponse & { isAdmin?: boolean };

export interface AuthResponse {
  token: string;
  refresh_token: string;
  expires_in?: string;
  user: User;
}

export type Translation = VocabularyItemResponse;
export type TTSResponse = ApiTTSResponse;
export type TTSLanguagesResponse = ApiTTSLanguagesResponse;
export type WordList = WordListResponse;
export type UserProgress = UserProgressResponse;

export interface QuizFeedback {
  message: string;
  isSuccess: boolean;
}

export interface LevelWordListItem {
  id: string;
  key: string;
  label: string;
  icon: LucideIcon;
  description: (sourceLanguage: string, targetLanguage: string) => string;
  words: string[];
  count: number;
}

export interface LevelWordLists {
  [levelId: string]: LevelWordListItem;
}

export interface TranslationDisplay {
  source: string;
  target: string;
}

export type ContentVersion = ContentVersionResponse;
export type AdminVocabularyItem = VocabularyItemDetailResponse;
