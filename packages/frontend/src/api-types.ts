import type { VocabularyItemDetailResponse } from '@lingua-quiz/api-client';
import type {
  ContentVersion as DomainContentVersion,
  User as DomainUser,
  UserProgress as DomainUserProgress,
  VocabularyItem as DomainVocabularyItem,
  WordList as DomainWordList,
  TtsLanguages,
  TtsResponse,
} from '@lingua-quiz/domain';
import type { LevelConfigItem } from './lib/config/levelConfig';

export type User = DomainUser & { isAdmin?: boolean };

export interface AuthResponse {
  token: string;
  refresh_token: string;
  expires_in?: string;
  user: User;
}

export type Translation = DomainVocabularyItem;
export type TTSResponse = TtsResponse;
export type TTSLanguagesResponse = TtsLanguages;
export type WordList = DomainWordList;
export type UserProgress = DomainUserProgress;

export interface QuizFeedback {
  message: string;
  isSuccess: boolean;
}

export interface LevelWordListItem extends LevelConfigItem {
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

export type ContentVersion = DomainContentVersion;
export type AdminVocabularyItem = VocabularyItemDetailResponse;
