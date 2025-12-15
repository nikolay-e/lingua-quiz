import {
  F,
  K,
  T_PROMO,
  MISTAKE_THRESHOLD,
  MISTAKE_WINDOW,
  MAX_FOCUS_POOL_SIZE,
  MIN_HISTORY_FOR_DEGRADATION,
} from './constants';
import { checkAnswer, formatForDisplay } from './answer-comparison';
import type { Translation, ProgressEntry } from './types';
import type { LevelKey } from '@lingua-quiz/domain';
import { QueueManager, type LevelStatus, type Queues } from './QueueManager';
import { LevelEngine, type PracticeLevel, type QuestionDirection, type QuestionType } from './LevelEngine';
import { StateManager } from './StateManager';

export type { LevelStatus, PracticeLevel, QuestionDirection, QuestionType };

export interface QuizQuestion {
  translationId: string;
  questionText: string;
  level: Extract<LevelKey, 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5'>;
  direction: QuestionDirection;
  sourceLanguage: string;
  targetLanguage: string;
  questionType: QuestionType;
  usageExample?: string;
}

export interface SubmissionResult {
  isCorrect: boolean;
  correctAnswerText: string;
  submittedAnswerText: string;
  translation: Translation;
  levelChange?: {
    from: string;
    to: string;
  };
  responseTimeMs?: number;
}

export interface RevealResult {
  correctAnswerText: string;
  translation: Translation;
}

export interface QuizState {
  translations: Translation[];
  progress: ProgressEntry[];
  currentLevel: PracticeLevel;
  queues: Queues;
}

export interface QuizOptions {
  maxFocusWords?: number;
  correctAnswersToLevelUp?: number;
  mistakesToLevelDown?: number;
  historySizeForDegradation?: number;
  queuePositionIncrement?: number;
  enableUsageExamples?: boolean;
}

export interface InitialState {
  progress?: ProgressEntry[];
  currentLevel?: PracticeLevel;
}

export class QuizManager {
  private queueManager: QueueManager;
  private levelEngine: LevelEngine;
  private stateManager: StateManager;
  private currentLevel: PracticeLevel;
  private opts: Required<QuizOptions>;
  private submissionStartTime: number | null = null;

  constructor(translations: Translation[], initialState: InitialState = {}, options: QuizOptions = {}) {
    this.opts = {
      maxFocusWords: options.maxFocusWords ?? MAX_FOCUS_POOL_SIZE,
      correctAnswersToLevelUp: options.correctAnswersToLevelUp ?? T_PROMO,
      mistakesToLevelDown: options.mistakesToLevelDown ?? MISTAKE_THRESHOLD,
      historySizeForDegradation: options.historySizeForDegradation ?? MISTAKE_WINDOW,
      queuePositionIncrement: options.queuePositionIncrement ?? K * F,
      enableUsageExamples: options.enableUsageExamples ?? true,
    };

    const progressArray = initialState.progress ?? [];
    const initialProgressMap = new Map(progressArray.map((p) => [p.translationId, p]));

    const fullProgress = translations.map((t, index) => {
      const existing = initialProgressMap.get(t.id);
      return (
        existing ?? {
          translationId: t.id,
          level: 'LEVEL_0' as LevelStatus,
          queuePosition: index,
          consecutiveCorrect: 0,
          recentHistory: [],
        }
      );
    });

    this.queueManager = new QueueManager(translations, fullProgress);
    this.stateManager = new StateManager(translations, fullProgress);
    this.levelEngine = new LevelEngine(this.queueManager);

    this.currentLevel = initialState.currentLevel ?? 'LEVEL_1';
    this.queueManager.replenishFocusPool(this.opts.maxFocusWords);
  }

  getNextQuestion = (): { question: QuizQuestion | null; levelAdjusted?: boolean; newLevel?: PracticeLevel } => {
    if (!this.levelEngine.hasWordsForLevel(this.currentLevel)) {
      const newLevel = this.levelEngine.getLowestAvailablePracticeLevel();
      const levelAdjusted = newLevel !== this.currentLevel;
      this.currentLevel = newLevel;

      if (!this.levelEngine.hasWordsForLevel(this.currentLevel)) {
        return { question: null };
      }

      if (levelAdjusted) {
        return { question: this.generateQuestion(), levelAdjusted: true, newLevel };
      }
    }

    return { question: this.generateQuestion() };
  };

  private generateQuestion = (): QuizQuestion | null => {
    const candidateId = this.levelEngine.pickCandidateForLevel(this.currentLevel);

    if (candidateId === null) {
      return null;
    }

    const t = this.stateManager.getTranslation(candidateId);
    const p = this.stateManager.getProgress(candidateId);
    if (t === undefined || p === undefined) return null;

    this.stateManager.updateProgress(candidateId, { lastAskedAt: new Date().toISOString() });

    const direction = this.levelEngine.getDirection(this.currentLevel);
    const questionType = this.levelEngine.getQuestionType(this.currentLevel);

    this.submissionStartTime = Date.now();

    return {
      translationId: t.id,
      questionText: direction === 'normal' ? t.sourceText : t.targetText,
      level: this.currentLevel,
      direction,
      sourceLanguage: t.sourceLanguage,
      targetLanguage: t.targetLanguage,
      questionType,
      usageExample: this.getUsageExample(questionType, direction, t),
    };
  };

  setLevel = (level: PracticeLevel): { success: boolean; actualLevel: PracticeLevel; message?: string } => {
    if (this.levelEngine.hasWordsForLevel(level)) {
      this.currentLevel = level;
      return { success: true, actualLevel: level };
    }

    const lowestAvailable = this.levelEngine.getLowestAvailablePracticeLevel();
    this.currentLevel = lowestAvailable;

    return {
      success: false,
      actualLevel: lowestAvailable,
      message: `${level} has no available words. Switched to ${lowestAvailable}.`,
    };
  };

  private getUsageExample = (
    questionType: QuestionType,
    direction: QuestionDirection,
    translation: Translation,
  ): string | undefined => {
    if (questionType !== 'usage') {
      return undefined;
    }
    const example = direction === 'normal' ? translation.sourceUsageExample : translation.targetUsageExample;
    return example ?? undefined;
  };

  revealAnswer = (translationId: string): RevealResult => {
    const t = this.stateManager.getTranslation(translationId);
    if (t === undefined) throw new Error('Translation not found');

    const direction = this.levelEngine.getDirection(this.currentLevel);
    const correctAnswerText = direction === 'normal' ? t.targetText : t.sourceText;

    this.submissionStartTime = null;

    return {
      correctAnswerText,
      translation: t,
    };
  };

  submitAnswer = (translationId: string, userAnswer: string): SubmissionResult => {
    const p = this.stateManager.getProgress(translationId);
    const t = this.stateManager.getTranslation(translationId);
    if (p === undefined || t === undefined) throw new Error('Translation or progress not found');

    const direction = this.levelEngine.getDirection(this.currentLevel);
    const correctAnswerText = direction === 'normal' ? t.targetText : t.sourceText;
    const isCorrect = checkAnswer(userAnswer, correctAnswerText);

    const recentHistory = [...p.recentHistory.slice(-this.opts.historySizeForDegradation + 1), isCorrect];
    const consecutiveCorrect = isCorrect ? p.consecutiveCorrect + 1 : 0;

    const responseTimeMs = this.submissionStartTime !== null ? Date.now() - this.submissionStartTime : undefined;
    this.submissionStartTime = null;

    const oldLevel = p.level;

    const queuePosition = this.queueManager.updatePosition(
      translationId,
      p.level,
      isCorrect,
      consecutiveCorrect,
      F,
      this.opts.queuePositionIncrement,
    );

    this.stateManager.updateProgress(translationId, {
      recentHistory,
      consecutiveCorrect,
      queuePosition,
    });

    const updatedProgress = this.stateManager.getProgress(translationId);
    if (updatedProgress !== undefined) {
      const newLevel = this.levelEngine.checkLevelProgression(
        updatedProgress,
        this.opts.correctAnswersToLevelUp,
        this.opts.mistakesToLevelDown,
        MIN_HISTORY_FOR_DEGRADATION,
      );

      if (newLevel !== null) {
        const newQueuePosition = this.queueManager.moveWordToLevel(translationId, oldLevel, newLevel);
        const resetProgress = newLevel < oldLevel;
        this.stateManager.updateProgress(translationId, {
          level: newLevel,
          queuePosition: newQueuePosition,
          consecutiveCorrect: 0,
          recentHistory: resetProgress ? [] : updatedProgress.recentHistory,
        });
      }
    }

    const finalProgress = this.stateManager.getProgress(translationId);
    const shouldExclude = finalProgress?.level === 'LEVEL_0';
    this.queueManager.replenishFocusPool(this.opts.maxFocusWords, shouldExclude ? translationId : undefined);

    return {
      isCorrect,
      correctAnswerText,
      submittedAnswerText: userAnswer,
      translation: t,
      levelChange:
        finalProgress !== undefined && oldLevel !== finalProgress.level
          ? { from: oldLevel, to: finalProgress.level }
          : undefined,
      responseTimeMs,
    };
  };

  getState = (): QuizState => ({
    translations: this.stateManager.getAllTranslations(),
    progress: this.stateManager.getAllProgress(),
    currentLevel: this.currentLevel,
    queues: this.queueManager.getQueues(),
  });

  getTranslation = (id: string): Translation | undefined => {
    return this.stateManager.getTranslation(id);
  };

  getTranslationForDisplay = (id: string): { source: string; target: string } | undefined => {
    const translation = this.stateManager.getTranslation(id);
    if (translation === undefined) return undefined;

    return {
      source: formatForDisplay(translation.sourceText),
      target: formatForDisplay(translation.targetText),
    };
  };

  isQuizComplete = (): boolean => {
    return this.stateManager.isQuizComplete(this.opts.enableUsageExamples);
  };

  getCompletionPercentage = (): number => {
    return this.stateManager.getCompletionPercentage(this.opts.enableUsageExamples);
  };

  getStatistics = (): {
    totalWords: number;
    levelCounts: Record<string, number>;
    completionPercentage: number;
    isComplete: boolean;
  } => {
    return this.stateManager.getStatistics(this.opts.enableUsageExamples);
  };

  getCurrentLevel = (): PracticeLevel => this.currentLevel;

  getOptions = (): Required<QuizOptions> => ({ ...this.opts });

  getWordsByLevel = (): Record<LevelStatus, string[]> => {
    return this.queueManager.getWordsByLevel();
  };
}
export * from './constants';
export * from './answer-comparison';
export * from './types';
export { QueueManager } from './QueueManager';
export { LevelEngine } from './LevelEngine';
export { StateManager } from './StateManager';
