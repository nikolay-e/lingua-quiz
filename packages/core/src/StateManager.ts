import { createZeroLevelCounts } from '@lingua-quiz/domain';
import type { Translation, ProgressEntry } from './types';

export class StateManager {
  private translations: Map<string, Translation>;
  private progress: Map<string, ProgressEntry>;
  private progressArrayCache: ProgressEntry[] | null = null;
  private statisticsCache: Map<boolean, ReturnType<StateManager['getStatistics']>> = new Map();

  constructor(translations: Translation[], initialProgress: ProgressEntry[]) {
    this.translations = new Map(translations.map((t) => [t.id, t]));
    this.progress = new Map(initialProgress.map((p) => [p.translationId, p]));
  }

  private invalidateCache(): void {
    this.progressArrayCache = null;
    this.statisticsCache.clear();
  }

  private getProgressArray(): ProgressEntry[] {
    this.progressArrayCache ??= Array.from(this.progress.values());
    return this.progressArrayCache.map((p) => ({ ...p, recentHistory: [...p.recentHistory] }));
  }

  getTranslation(id: string): Translation | undefined {
    return this.translations.get(id);
  }

  getProgress(id: string): ProgressEntry | undefined {
    const progress = this.progress.get(id);
    return progress !== undefined ? { ...progress, recentHistory: [...progress.recentHistory] } : undefined;
  }

  getAllProgress(): ProgressEntry[] {
    return this.getProgressArray();
  }

  getAllTranslations(): Translation[] {
    return Array.from(this.translations.values());
  }

  updateProgress(id: string, updates: Partial<ProgressEntry>): void {
    const current = this.progress.get(id);
    if (current !== undefined) {
      this.progress.set(id, { ...current, ...updates });
      this.invalidateCache();
    }
  }

  getStatistics(enableUsageExamples: boolean): {
    totalWords: number;
    levelCounts: Record<string, number>;
    completionPercentage: number;
    isComplete: boolean;
  } {
    const cached = this.statisticsCache.get(enableUsageExamples);
    if (cached !== undefined) {
      return cached;
    }

    const allProgress = this.getProgressArray();
    const levelCounts = createZeroLevelCounts();

    allProgress.forEach((p) => {
      levelCounts[p.level] = levelCounts[p.level] + 1;
    });

    const targetLevel = enableUsageExamples ? 'LEVEL_5' : 'LEVEL_3';
    const completed = allProgress.filter((p) => p.level === targetLevel).length;
    const completionPercentage = allProgress.length === 0 ? 0 : Math.round((completed / allProgress.length) * 100);
    const isComplete = allProgress.length > 0 && allProgress.every((p) => p.level === targetLevel);

    const result = {
      totalWords: allProgress.length,
      levelCounts,
      completionPercentage,
      isComplete,
    };

    this.statisticsCache.set(enableUsageExamples, result);
    return result;
  }

  isQuizComplete(enableUsageExamples: boolean): boolean {
    return this.getStatistics(enableUsageExamples).isComplete;
  }

  getCompletionPercentage(enableUsageExamples: boolean): number {
    return this.getStatistics(enableUsageExamples).completionPercentage;
  }
}
