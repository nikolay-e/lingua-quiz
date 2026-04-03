import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuizQuestion } from '@lingua-quiz/core';
import type { LevelWordLists } from '@api/types';
import { LEVEL_CONFIG } from '../config/levelConfig';

interface QuestionDisplayProps {
  currentQuestion?: QuizQuestion | null;
  levelWordLists?: LevelWordLists;
  pronunciationMode?: boolean;
}

export function QuestionDisplay({
  currentQuestion = null,
  levelWordLists = {},
  pronunciationMode = false,
}: QuestionDisplayProps): React.JSX.Element {
  const { t } = useTranslation();

  const questionLanguage =
    currentQuestion?.direction === 'reverse'
      ? (currentQuestion.targetLanguage ?? 'en')
      : (currentQuestion?.sourceLanguage ?? 'en');

  const levelInfo = useMemo(() => {
    if (currentQuestion === null) return null;
    const config = LEVEL_CONFIG.find((c) => c.key === currentQuestion.level);
    if (config === undefined) return null;
    return {
      label: config.label,
      description: config.description(currentQuestion.sourceLanguage, currentQuestion.targetLanguage),
      id: config.id,
    };
  }, [currentQuestion]);

  const totalWords = useMemo(
    () => Object.values(levelWordLists).reduce((sum, level) => sum + level.count, 0),
    [levelWordLists],
  );

  const masteredCount = useMemo(() => {
    const masteredLevels = ['level3', 'level4', 'level5'];
    return Object.entries(levelWordLists)
      .filter(([id]) => masteredLevels.includes(id))
      .reduce((sum, [, l]) => sum + l.count, 0);
  }, [levelWordLists]);

  const completionPercent = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

  if (currentQuestion === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-20 px-6 py-4 bg-muted/50 rounded-lg opacity-70">
        <span id="word" className="text-lg font-bold text-muted-foreground text-center">
          {t('quiz.noQuestions')}
        </span>
        <p className="text-sm text-muted-foreground mt-2">{t('quiz.noQuestionsDesc')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {levelInfo !== null && !pronunciationMode && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{levelInfo.description}</span>
          <output className="text-sm text-muted-foreground font-medium">{completionPercent}%</output>
        </div>
      )}
      {levelInfo !== null && !pronunciationMode && (
        <progress
          className="progress-bar"
          value={completionPercent}
          max="100"
          aria-label={`Level completion: ${completionPercent}%`}
        >
          {completionPercent}%
        </progress>
      )}
      <div className="flex flex-col items-center justify-center min-h-20 px-6 py-4 bg-primary/5 rounded-lg">
        <span
          id="word"
          className="question-text text-xl font-bold text-primary text-center wrap-break-word hyphens-auto"
          lang={questionLanguage}
        >
          {currentQuestion.questionText}
        </span>
      </div>
    </div>
  );
}
