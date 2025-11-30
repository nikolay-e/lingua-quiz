import type { Translation, ProgressEntry } from './types';

export class StateManager {
  private translations: Map<string, Translation>;
  private progress: Map<string, ProgressEntry>;

  constructor(translations: Translation[], initialProgress: ProgressEntry[]) {
    this.translations = new Map(translations.map((t) => [t.id, t]));
    this.progress = new Map(initialProgress.map((p) => [p.translationId, p]));
  }

  getTranslation(id: string): Translation | undefined {
    return this.translations.get(id);
  }

  getProgress(id: string): ProgressEntry | undefined {
    return this.progress.get(id);
  }

  getAllProgress(): ProgressEntry[] {
    return Array.from(this.progress.values());
  }

  getAllTranslations(): Translation[] {
    return Array.from(this.translations.values());
  }

  updateProgress(id: string, updates: Partial<ProgressEntry>): void {
    const current = this.progress.get(id);
    if (current !== undefined) {
      this.progress.set(id, { ...current, ...updates });
    }
  }

  getStatistics(enableUsageExamples: boolean): {
    totalWords: number;
    levelCounts: Record<string, number>;
    completionPercentage: number;
    isComplete: boolean;
  } {
    const allProgress = Array.from(this.progress.values());
    const levelCounts: Record<string, number> = {
      LEVEL_0: 0,
      LEVEL_1: 0,
      LEVEL_2: 0,
      LEVEL_3: 0,
      LEVEL_4: 0,
      LEVEL_5: 0,
    };

    allProgress.forEach((p) => {
      const currentCount = levelCounts[p.level] ?? 0;
      levelCounts[p.level] = currentCount + 1;
    });

    const targetLevel = enableUsageExamples ? 'LEVEL_5' : 'LEVEL_3';
    const completed = allProgress.filter((p) => p.level === targetLevel).length;
    const completionPercentage = allProgress.length === 0 ? 0 : Math.round((completed / allProgress.length) * 100);
    const isComplete = allProgress.length > 0 && allProgress.every((p) => p.level === targetLevel);

    return {
      totalWords: allProgress.length,
      levelCounts,
      completionPercentage,
      isComplete,
    };
  }

  isQuizComplete(enableUsageExamples: boolean): boolean {
    const allProgress = Array.from(this.progress.values());
    if (allProgress.length === 0) return false;

    const targetLevel = enableUsageExamples ? 'LEVEL_5' : 'LEVEL_3';
    return allProgress.every((p) => p.level === targetLevel);
  }

  getCompletionPercentage(enableUsageExamples: boolean): number {
    const allProgress = Array.from(this.progress.values());
    if (allProgress.length === 0) return 0;

    const targetLevel = enableUsageExamples ? 'LEVEL_5' : 'LEVEL_3';
    const completed = allProgress.filter((p) => p.level === targetLevel).length;

    return Math.round((completed / allProgress.length) * 100);
  }
}
