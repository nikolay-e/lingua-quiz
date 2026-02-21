import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatForDisplay, type SubmissionResult, type QuizQuestion, type RevealResult } from '@lingua-quiz/core';
import { RefreshCw, Check, X, Circle } from 'lucide-react';
import { cn } from '@shared/utils';
import { Button } from '@shared/ui';
import type { QuizFeedback } from '@api/types';

interface FeedbackDisplayProps {
  feedback?: SubmissionResult | QuizFeedback | RevealResult | null;
  questionForFeedback?: QuizQuestion | null;
  onRetry?: () => void;
}

export function FeedbackDisplay({
  feedback = null,
  questionForFeedback = null,
  onRetry,
}: FeedbackDisplayProps): React.JSX.Element | null {
  const { t } = useTranslation();

  const isRevealResult =
    feedback !== null && 'correctAnswerText' in feedback && !('isCorrect' in feedback) && !('isSuccess' in feedback);

  const isSuccess = useMemo(() => {
    if (feedback === null) return false;
    if ('isSuccess' in feedback) return feedback.isSuccess;
    if ('isCorrect' in feedback) return feedback.isCorrect;
    return false;
  }, [feedback]);

  const isQuizFeedback = feedback !== null && 'isSuccess' in feedback && !('isCorrect' in feedback);
  const showRetry = isQuizFeedback && !isSuccess && onRetry !== undefined;

  const feedbackMessage = useMemo(() => {
    if (feedback === null) return '';
    if ('message' in feedback) return feedback.message;
    const questionText = questionForFeedback?.questionText ?? '';
    return `${questionText} = ${formatForDisplay(feedback.correctAnswerText)}`;
  }, [feedback, questionForFeedback]);

  if (feedback === null) return null;

  return (
    <div className="feedback-container flex flex-col gap-3" role="alert">
      <div
        className={cn(
          'feedback-text flex items-center justify-center gap-3 px-4 py-3 min-h-10 font-semibold rounded-lg border text-center transition-all',
          isRevealResult && 'revealed text-muted-foreground bg-muted/50 border-border animate-fade-in',
          isSuccess && 'success text-success bg-success/10 border-success ring-1 ring-success animate-success-pulse',
          !isRevealResult &&
            !isSuccess &&
            'error text-destructive bg-destructive/10 border-destructive ring-1 ring-destructive animate-shake',
        )}
      >
        <span className="text-lg" aria-hidden="true">
          {isRevealResult && <Circle size={18} />}
          {!isRevealResult && isSuccess && <Check size={18} className="animate-icon-pop" />}
          {!isRevealResult && !isSuccess && <X size={18} />}
        </span>
        <span>{feedbackMessage}</span>
      </div>
      {showRetry && (
        <Button variant="outline" onClick={onRetry} className="w-full">
          <RefreshCw size={16} />
          <span>{t('quiz.tryAgain')}</span>
        </Button>
      )}
    </div>
  );
}
