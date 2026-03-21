import api, { type WordList, type Translation, type UserProgress } from '@api';
import { OpenAPI } from '@lingua-quiz/api-client';
import { QuizManager, type QuizQuestion, type SubmissionResult, type RevealResult } from '@lingua-quiz/core';
import { STORAGE_KEYS, safeStorage, logger, clearTimer, extractErrorMessage } from '@shared/utils';

export type SaveErrorCallback = (message: string) => void;

export interface ProgressData {
  level: number;
  queuePosition: number;
  correctCount: number;
  incorrectCount: number;
  consecutiveCorrect: number;
  recentHistory: boolean[];
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
  private readonly progressMap = new Map<string, ProgressData>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private saveInProgress = false;
  private logoutCallback: LogoutCallback | null = null;
  private saveErrorCallback: SaveErrorCallback | null = null;
  private readonly DEBOUNCE_DELAY = 1000;

  setLogoutCallback(callback: LogoutCallback): void {
    this.logoutCallback = callback;
  }

  setSaveErrorCallback(callback: SaveErrorCallback): void {
    this.saveErrorCallback = callback;
  }

  hasPendingChanges(): boolean {
    return this.progressMap.size > 0 || this.debounceTimer !== null;
  }

  handleAuthError(error: unknown): AuthErrorInfo {
    if (error instanceof Error && error.message === 'Unauthorized') {
      logger.warn('Session expired during quiz operation. Redirecting to login.');
      this.logoutCallback?.();
      return { isUnauthorized: true, message: 'Your session has expired. Please log in again.' };
    }
    return { isUnauthorized: false, message: extractErrorMessage(error, 'Unknown error') };
  }

  async withAuthHandling<T>(operation: () => Promise<T>, onError?: (message: string) => void): Promise<T | null> {
    try {
      return await operation();
    } catch (error: unknown) {
      const errorInfo = this.handleAuthError(error);
      onError?.(errorInfo.message);
      if (!errorInfo.isUnauthorized) {
        throw error;
      }
      return null;
    }
  }

  async loadWordLists(token: string): Promise<WordList[] | null> {
    const [versionResult, wordListsResult] = await Promise.all([
      api.fetchContentVersion(token).catch((error: unknown) => {
        logger.warn('Failed to fetch content version, continuing without version check:', { error });
        return null;
      }),
      this.withAuthHandling(() => api.fetchWordLists(token)),
    ]);

    if (versionResult !== null) {
      const savedVersion = safeStorage.getItem(STORAGE_KEYS.CONTENT_VERSION);
      const currentVersionId = versionResult.versionId.toString();

      if (savedVersion !== null && Number.parseInt(savedVersion) !== versionResult.versionId) {
        logger.info(`Content version changed: ${savedVersion} -> ${currentVersionId}. Clearing cache.`);
        this.progressMap.clear();
      }
      safeStorage.setItem(STORAGE_KEYS.CONTENT_VERSION, currentVersionId);
    }

    return wordListsResult;
  }

  async startQuiz(token: string, quizName: string): Promise<QuizSession | null> {
    return this.withAuthHandling(async () => {
      const [translations, userProgress]: [Translation[], UserProgress[]] = await Promise.all([
        api.fetchTranslations(token, quizName),
        api.fetchUserProgress(token, quizName),
      ]);

      interface ProgressEntry {
        level: number;
        queuePosition: number;
        correctCount: number;
        incorrectCount: number;
        consecutiveCorrect: number;
        recentHistory: boolean[];
        lastPracticed: string | null;
      }

      const progressLookup = new Map<string, ProgressEntry>(
        userProgress.map((p: UserProgress) => [
          p.vocabularyItemId,
          {
            level: p.level,
            queuePosition: p.queuePosition,
            correctCount: p.correctCount,
            incorrectCount: p.incorrectCount,
            consecutiveCorrect: p.consecutiveCorrect,
            recentHistory: p.recentHistory ?? [],
            lastPracticed: p.lastPracticed,
          },
        ]),
      );

      const hasInitializedProgress = userProgress.some((p: UserProgress) => p.queuePosition > 0);

      let orderedTranslations = translations;
      if (!hasInitializedProgress && translations.length > 0) {
        orderedTranslations = [...translations].sort(() => Math.random() - 0.5);
      }

      const translationData = orderedTranslations.map((word: Translation) => ({
        id: word.id,
        sourceText: word.sourceText,
        sourceLanguage: word.sourceLanguage,
        sourceUsageExample: word.sourceUsageExample ?? '',
        targetText: word.targetText,
        targetLanguage: word.targetLanguage,
        targetUsageExample: word.targetUsageExample ?? '',
        listName: word.listName,
        difficultyLevel: word.difficultyLevel,
      }));

      const progress = orderedTranslations.map((word: Translation, index: number) => {
        const userProg = progressLookup.get(word.id);
        const level = userProg?.level ?? 0;
        const queuePosition = userProg?.queuePosition ?? index;

        return {
          translationId: word.id,
          level: `LEVEL_${level}` as 'LEVEL_0' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5',
          queuePosition,
          consecutiveCorrect: userProg?.consecutiveCorrect ?? 0,
          recentHistory: userProg?.recentHistory ?? ([] as boolean[]),
          lastAskedAt: userProg?.lastPracticed ?? undefined,
        };
      });

      this.progressMap.clear();

      for (const [vocabularyItemId, prog] of progressLookup.entries()) {
        const translation = orderedTranslations.find((t: Translation) => t.id === vocabularyItemId);
        if (translation !== undefined) {
          this.progressMap.set(vocabularyItemId, {
            level: prog.level,
            queuePosition: prog.queuePosition,
            correctCount: prog.correctCount,
            incorrectCount: prog.incorrectCount,
            consecutiveCorrect: prog.consecutiveCorrect,
            recentHistory: prog.recentHistory,
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

  revealAnswer(manager: QuizManager, question: QuizQuestion, token: string): RevealResult | null {
    const result = manager.revealAnswer(question.translationId);
    this.trackRevealProgress(manager, question, token);
    return result;
  }

  private trackRevealProgress(manager: QuizManager, question: QuizQuestion, token: string): void {
    const translation = manager.getTranslation(question.translationId);
    if (translation === undefined) return;

    const quizState = manager.getState();
    const currentProgress = quizState.progress.find((p) => p.translationId === question.translationId);
    if (currentProgress === undefined) return;

    const level = Number.parseInt(currentProgress.level.replace('LEVEL_', ''));
    const existing = this.progressMap.get(translation.id) ?? {
      correctCount: 0,
      incorrectCount: 0,
      level: 0,
      queuePosition: 0,
      consecutiveCorrect: 0,
      recentHistory: [] as boolean[],
      targetLanguage: translation.targetLanguage,
    };

    this.progressMap.set(translation.id, {
      level,
      queuePosition: currentProgress.queuePosition ?? 0,
      correctCount: existing.correctCount,
      incorrectCount: existing.incorrectCount + 1,
      consecutiveCorrect: currentProgress.consecutiveCorrect,
      recentHistory: currentProgress.recentHistory,
      targetLanguage: translation.targetLanguage,
    });

    this.debouncedSave(token, manager);
  }

  submitAnswer(manager: QuizManager, question: QuizQuestion, answer: string, token: string): SubmissionResult | null {
    const feedback = manager.submitAnswer(question.translationId, answer);

    const translation = manager.getTranslation(question.translationId);
    if (translation === undefined) {
      logger.error(`Translation not found for ID ${question.translationId}`);
      return feedback;
    }

    const quizState = manager.getState();
    const currentProgress = quizState.progress.find((p) => p.translationId === question.translationId);

    if (currentProgress === undefined) {
      logger.error(`Progress not found for translation ID ${question.translationId}`);
      return feedback;
    }

    const level = Number.parseInt(currentProgress.level.replace('LEVEL_', ''));
    const existing = this.progressMap.get(translation.id) ?? {
      correctCount: 0,
      incorrectCount: 0,
      level: 0,
      queuePosition: 0,
      consecutiveCorrect: 0,
      recentHistory: [] as boolean[],
      targetLanguage: translation.targetLanguage,
    };

    this.progressMap.set(translation.id, {
      level,
      queuePosition: currentProgress.queuePosition ?? 0,
      correctCount: existing.correctCount + (feedback.isCorrect ? 1 : 0),
      incorrectCount: existing.incorrectCount + (feedback.isCorrect ? 0 : 1),
      consecutiveCorrect: currentProgress.consecutiveCorrect,
      recentHistory: currentProgress.recentHistory,
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
        } catch (error: unknown) {
          logger.error('Failed to save progress before level change:', error);
        }
      }

      return manager.setLevel(level);
    } catch (error: unknown) {
      logger.error('Failed to set level:', error);
      return { success: false, actualLevel: 'LEVEL_1' as const, message: 'Failed to set level' };
    }
  }

  private debouncedSave(token: string, manager: QuizManager): void {
    this.debounceTimer = clearTimer(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.bulkSaveProgress(token, manager).catch((err) => {
        logger.error('Debounced save failed:', err);
      });
    }, this.DEBOUNCE_DELAY);
  }

  private async saveProgressItems(token: string): Promise<void> {
    if (this.saveInProgress || this.progressMap.size === 0) return;

    this.saveInProgress = true;

    const itemsToSave = new Map(this.progressMap);
    this.progressMap.clear();

    this.debounceTimer = clearTimer(this.debounceTimer);

    try {
      const items = Array.from(itemsToSave.entries()).map(([vocabularyItemId, progress]) => ({
        vocabularyItemId,
        level: progress.level,
        queuePosition: progress.queuePosition,
        correctCount: progress.correctCount,
        incorrectCount: progress.incorrectCount,
        consecutiveCorrect: progress.consecutiveCorrect,
        recentHistory: progress.recentHistory,
      }));

      if (items.length > 0) {
        await api.saveBulkProgress(token, items);
      }
    } catch (error: unknown) {
      const errorInfo = this.handleAuthError(error);
      if (!errorInfo.isUnauthorized) {
        logger.error('Bulk save error:', error);
        this.saveErrorCallback?.('Failed to save progress. Please check your connection.');
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

  async bulkSaveProgress(token: string, manager: QuizManager | null): Promise<void> {
    if (manager === null || this.progressMap.size === 0) return;
    await this.saveProgressItems(token);
  }

  cleanup(): void {
    this.debounceTimer = clearTimer(this.debounceTimer);
    this.progressMap.clear();
  }

  async saveAndCleanup(token: string, manager: QuizManager | null): Promise<void> {
    this.debounceTimer = clearTimer(this.debounceTimer);
    if (manager !== null) {
      await this.bulkSaveProgress(token, manager).catch((err: unknown) =>
        logger.error('Failed to save progress on stop:', err),
      );
    }
  }

  persistPendingToStorage(): void {
    if (this.progressMap.size === 0) return;

    const pending = Array.from(this.progressMap.entries()).map(([id, p]) => ({
      vocabularyItemId: id,
      ...p,
    }));

    try {
      safeStorage.setItem(STORAGE_KEYS.PENDING_PROGRESS, JSON.stringify(pending));
    } catch {
      logger.warn('Failed to persist pending progress to storage');
    }
  }

  async restorePendingFromStorage(token: string): Promise<void> {
    const pendingJson = safeStorage.getItem(STORAGE_KEYS.PENDING_PROGRESS);
    if (pendingJson === null || pendingJson === '') return;

    try {
      const pending = JSON.parse(pendingJson) as Array<ProgressData & { vocabularyItemId: string }>;
      safeStorage.removeItem(STORAGE_KEYS.PENDING_PROGRESS);

      for (const item of pending) {
        if (!this.progressMap.has(item.vocabularyItemId)) {
          this.progressMap.set(item.vocabularyItemId, {
            level: item.level,
            queuePosition: item.queuePosition,
            correctCount: item.correctCount,
            incorrectCount: item.incorrectCount,
            consecutiveCorrect: item.consecutiveCorrect ?? 0,
            recentHistory: item.recentHistory ?? [],
            targetLanguage: item.targetLanguage,
          });
        }
      }

      if (this.progressMap.size > 0) {
        await this.saveProgressItems(token).catch((error) => {
          logger.warn('Failed to restore pending progress from bulk save', { error });
          this.persistPendingToStorage();
        });
      }
    } catch (error) {
      logger.warn('Failed to parse pending progress from storage', { error });
      safeStorage.removeItem(STORAGE_KEYS.PENDING_PROGRESS);
    }
  }

  flushImmediately(token: string, manager: QuizManager | null, isUnloading = false): void {
    this.persistPendingToStorage();
    this.debounceTimer = clearTimer(this.debounceTimer);

    if (this.progressMap.size > 0) {
      if (isUnloading) {
        this.keepaliveSave(token);
      } else if (manager !== null) {
        this.bulkSaveProgress(token, manager).catch((error) => {
          logger.warn('Failed to flush progress immediately', { error });
          this.persistPendingToStorage();
        });
      }
    }
  }

  private keepaliveSave(token: string): void {
    const items = Array.from(this.progressMap.entries()).map(([vocabularyItemId, progress]) => ({
      vocabularyItemId,
      level: progress.level,
      queuePosition: progress.queuePosition,
      correctCount: progress.correctCount,
      incorrectCount: progress.incorrectCount,
      consecutiveCorrect: progress.consecutiveCorrect,
      recentHistory: progress.recentHistory,
    }));

    if (items.length === 0) return;

    const url = `${OpenAPI.BASE}/api/user/progress/bulk`;

    void fetch(url, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items }),
    });
  }
}

export const quizService = new QuizService();
