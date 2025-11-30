import api from '../../api';
import { QuizManager, type QuizQuestion, type SubmissionResult } from '@lingua-quiz/core';
import type { WordList } from '../../api-types';
import { STORAGE_KEYS } from '../constants';
import { safeStorage } from '../utils/safeStorage';

export interface ProgressData {
  level: number;
  queuePosition: number;
  correctCount: number;
  incorrectCount: number;
  targetLanguage: string;
}

export interface QuizSession {
  manager: QuizManager;
  currentQuestion: QuizQuestion | null;
}

export interface AuthErrorInfo {
  isUnauthorized: boolean;
  message: string;
}

type LogoutCallback = () => void;

export class QuizService {
  private progressMap = new Map<string, ProgressData>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private saveInProgress = false;
  private logoutCallback: LogoutCallback | null = null;
  private readonly DEBOUNCE_DELAY = 1000;

  setLogoutCallback(callback: LogoutCallback): void {
    this.logoutCallback = callback;
  }

  handleAuthError(error: unknown): AuthErrorInfo {
    if (error instanceof Error && error.message === 'Unauthorized') {
      console.warn('Session expired during quiz operation. Redirecting to login.');
      this.logoutCallback?.();
      return { isUnauthorized: true, message: 'Your session has expired. Please log in again.' };
    }
    return { isUnauthorized: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }

  async withAuthHandling<T>(operation: () => Promise<T>, onError?: (message: string) => void): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      const errorInfo = this.handleAuthError(error);
      onError?.(errorInfo.message);
      if (!errorInfo.isUnauthorized) {
        throw error;
      }
      return null;
    }
  }

  async loadWordLists(token: string): Promise<WordList[] | null> {
    const versionChanged = await this.withAuthHandling(async () => {
      const currentVersion = await api.fetchContentVersion(token);
      const savedVersion = safeStorage.getItem(STORAGE_KEYS.CONTENT_VERSION);
      const currentVersionId = currentVersion.versionId.toString();

      if (savedVersion !== null && parseInt(savedVersion) !== currentVersion.versionId) {
        console.info(`Content version changed: ${savedVersion} -> ${currentVersionId}. Clearing cache.`);
        safeStorage.setItem(STORAGE_KEYS.CONTENT_VERSION, currentVersionId);
        return true;
      }

      safeStorage.setItem(STORAGE_KEYS.CONTENT_VERSION, currentVersionId);
      return false;
    });

    if (versionChanged === true) {
      this.progressMap.clear();
    }

    return this.withAuthHandling(() => api.fetchWordLists(token));
  }

  async startQuiz(token: string, quizName: string): Promise<QuizSession | null> {
    return this.withAuthHandling(async () => {
      const [translations, userProgress] = await Promise.all([
        api.fetchTranslations(token, quizName),
        api.fetchUserProgress(token, quizName),
      ]);

      const progressLookup = new Map(
        userProgress.map((p) => [
          p.vocabularyItemId,
          {
            level: p.level,
            queuePosition: p.queuePosition,
            correctCount: p.correctCount,
            incorrectCount: p.incorrectCount,
          },
        ]),
      );

      const hasInitializedProgress = userProgress.some((p) => p.queuePosition > 0);

      let orderedTranslations = translations;
      if (!hasInitializedProgress && translations.length > 0) {
        orderedTranslations = [...translations].sort(() => Math.random() - 0.5);
      }

      const translationData = orderedTranslations.map((word) => ({
        id: word.id,
        sourceText: word.sourceText,
        sourceLanguage: word.sourceLanguage,
        sourceUsageExample: word.sourceUsageExample ?? '',
        targetText: word.targetText,
        targetLanguage: word.targetLanguage,
        targetUsageExample: word.targetUsageExample ?? '',
        listName: word.listName,
      }));

      const progress = orderedTranslations.map((word, index) => {
        const userProg = progressLookup.get(word.id);
        const level = userProg?.level ?? 0;
        const queuePosition = userProg?.queuePosition ?? index;

        return {
          translationId: word.id,
          level: `LEVEL_${level}` as 'LEVEL_0' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5',
          queuePosition,
          consecutiveCorrect: 0,
          recentHistory: [] as boolean[],
        };
      });

      this.progressMap.clear();

      for (const [vocabularyItemId, prog] of progressLookup.entries()) {
        const translation = orderedTranslations.find((t) => t.id === vocabularyItemId);
        if (translation !== undefined) {
          this.progressMap.set(vocabularyItemId, {
            level: prog.level,
            queuePosition: prog.queuePosition,
            correctCount: prog.correctCount,
            incorrectCount: prog.incorrectCount,
            targetLanguage: translation.targetLanguage,
          });
        }
      }

      const manager = new QuizManager(translationData, {
        progress,
        currentLevel: 'LEVEL_1',
      });

      await this.bulkSaveProgress(token, manager);

      const questionResult = manager.getNextQuestion();
      return { manager, currentQuestion: questionResult.question };
    });
  }

  submitAnswer(manager: QuizManager, question: QuizQuestion, answer: string, token: string): SubmissionResult | null {
    const feedback = manager.submitAnswer(question.translationId, answer);

    const translation = manager.getTranslation(question.translationId);
    if (translation === undefined) {
      console.error(`Translation not found for ID ${question.translationId}`);
      return feedback;
    }

    const quizState = manager.getState();
    const currentProgress = quizState.progress.find((p) => p.translationId === question.translationId);

    if (currentProgress === undefined) {
      console.error(`Progress not found for translation ID ${question.translationId}`);
      return feedback;
    }

    const level = parseInt(currentProgress.level.replace('LEVEL_', ''));
    const existing = this.progressMap.get(translation.id) ?? {
      correctCount: 0,
      incorrectCount: 0,
      level: 0,
      queuePosition: 0,
      targetLanguage: translation.targetLanguage,
    };

    this.progressMap.set(translation.id, {
      level,
      queuePosition: currentProgress.queuePosition ?? 0,
      correctCount: existing.correctCount + (feedback.isCorrect ? 1 : 0),
      incorrectCount: existing.incorrectCount + (feedback.isCorrect ? 0 : 1),
      targetLanguage: translation.targetLanguage,
    });

    this.debouncedSave(token, manager);

    return feedback;
  }

  async setLevel(
    manager: QuizManager,
    level: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4',
    token?: string,
  ): Promise<{ success: boolean; actualLevel: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4'; message?: string }> {
    try {
      if (token !== undefined) {
        try {
          await this.bulkSaveProgress(token, manager);
        } catch (error) {
          console.error('Failed to save progress before level change:', error);
        }
      }

      return manager.setLevel(level);
    } catch (error) {
      console.error('Failed to set level:', error);
      return { success: false, actualLevel: 'LEVEL_1' as const, message: 'Failed to set level' };
    }
  }

  private debouncedSave(token: string, manager: QuizManager): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => this.bulkSaveProgress(token, manager), this.DEBOUNCE_DELAY);
  }

  async bulkSaveProgress(token: string, manager: QuizManager | null): Promise<void> {
    if (this.saveInProgress) return;
    if (manager === null || this.progressMap.size === 0) return;

    this.saveInProgress = true;

    const itemsToSave = new Map(this.progressMap);
    this.progressMap.clear();

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    try {
      const persistencePromises: Promise<void>[] = [];

      for (const [vocabularyItemId, progress] of itemsToSave.entries()) {
        const payload = {
          vocabularyItemId,
          level: progress.level,
          queuePosition: progress.queuePosition,
          correctCount: progress.correctCount,
          incorrectCount: progress.incorrectCount,
        };
        persistencePromises.push(
          api.saveProgress(token, payload).catch((err: unknown) => {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error(`Progress save failed for ${vocabularyItemId}:`, errorMessage, 'Payload:', payload);
            if (!this.progressMap.has(vocabularyItemId)) {
              this.progressMap.set(vocabularyItemId, progress);
            }
          }),
        );
      }

      if (persistencePromises.length > 0) {
        await Promise.allSettled(persistencePromises);
      }
    } catch (error) {
      const errorInfo = this.handleAuthError(error);
      if (!errorInfo.isUnauthorized) {
        console.error('Bulk save error:', error);
      }
      for (const [id, progress] of itemsToSave.entries()) {
        if (!this.progressMap.has(id)) {
          this.progressMap.set(id, progress);
        }
      }
    } finally {
      this.saveInProgress = false;
    }
  }

  cleanup(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.progressMap.clear();
  }

  async saveAndCleanup(token: string, manager: QuizManager | null): Promise<void> {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (manager !== null) {
      await this.bulkSaveProgress(token, manager).catch((err: unknown) =>
        console.error('Failed to save progress on stop:', err),
      );
    }
  }
}

export const quizService = new QuizService();
