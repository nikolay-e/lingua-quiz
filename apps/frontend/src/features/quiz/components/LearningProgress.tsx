import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import type { LevelWordLists } from '@api/types';
import { LEVEL_CONFIG } from '../config/levelConfig';

interface LearningProgressProps {
  selectedQuiz?: string | null;
  currentLevel?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  levelWordLists?: LevelWordLists;
  foldedLists?: Record<string, boolean>;
  onToggleFold?: (levelId: string) => void;
}

export function LearningProgress({
  selectedQuiz = null,
  currentLevel = 'LEVEL_1',
  sourceLanguage = '',
  targetLanguage = '',
  levelWordLists = {},
  foldedLists = {},
  onToggleFold,
}: LearningProgressProps): React.JSX.Element {
  const { t } = useTranslation();

  const getLevelDescription = (level: string): string => {
    const levelConfig = LEVEL_CONFIG.find((config) => config.key === level);
    return levelConfig?.description(sourceLanguage, targetLanguage) ?? '';
  };

  const totalWords = Object.values(levelWordLists).reduce((sum, level) => sum + level.count, 0);

  const getProgressText = (count: number, total: number): string => {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return `${count} of ${total} words (${percent}%)`;
  };

  return (
    <div className="flex flex-col gap-6">
      {selectedQuiz !== null && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
          <span className="text-sm font-medium text-foreground">{t('quiz.currentLevel')}</span>
          <span className="text-sm font-semibold text-primary">{getLevelDescription(currentLevel)}</span>
        </div>
      )}

      <section className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0">
        {Object.values(levelWordLists).map((levelData) => {
          const LevelIcon = LEVEL_CONFIG.find((c) => c.id === levelData.id)?.icon ?? ChevronRight;
          const isOpen = foldedLists[levelData.id] === false;

          return (
            <details
              key={levelData.id}
              id={levelData.id}
              className="group border border-border rounded-lg overflow-hidden"
              open={isOpen}
              onToggle={(e) => {
                const details = e.currentTarget;
                if (details.open !== isOpen) {
                  onToggleFold?.(levelData.id);
                }
              }}
            >
              <summary className="cursor-pointer select-none px-4 py-3 transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 list-none">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <ChevronRight size={14} className="transition-transform group-open:rotate-90" aria-hidden="true" />
                    <LevelIcon size={16} aria-hidden="true" />
                    <span className="text-sm font-medium">
                      {levelData.label} ({levelData.count})
                    </span>
                  </div>
                  <progress
                    className="progress-bar"
                    value={levelData.count}
                    max={totalWords}
                    aria-label={`${levelData.label}: ${getProgressText(levelData.count, totalWords)}`}
                  >
                    {getProgressText(levelData.count, totalWords)}
                  </progress>
                </div>
              </summary>
              <div className="px-4 pb-4 pt-2 animate-content-reveal">
                {levelData.words.length > 0 ? (
                  <ol id={`${levelData.id}-list`} className="pl-8 flex flex-col gap-2">
                    {levelData.words.map((word) => (
                      <li
                        key={`${levelData.id}-${word}`}
                        className="py-2 border-b border-border last:border-b-0 text-sm"
                      >
                        {word}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-muted-foreground italic text-sm">{t('quiz.noWordsYet')}</p>
                )}
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
