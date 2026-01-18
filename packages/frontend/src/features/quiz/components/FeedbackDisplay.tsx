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
    <div className="feedback-container flex flex-col gap-3" role="alert" aria-live="polite">
      <div
        className={cn(
          'flex items-center justify-center gap-3 px-4 py-3 min-h-10 font-semibold rounded-lg border text-center transition-all',
          isRevealResult && 'text-muted-foreground bg-muted/50 border-border animate-fade-in',
          isSuccess && 'text-success bg-success/10 border-success ring-1 ring-success animate-success-pulse',
          !isRevealResult &&
            !isSuccess &&
            'text-destructive bg-destructive/10 border-destructive ring-1 ring-destructive animate-shake',
        )}
      >
        <span className="text-lg" aria-hidden="true">
          {isRevealResult ? (
            <Circle size={18} />
          ) : isSuccess ? (
            <Check size={18} className="animate-icon-pop" />
          ) : (
            <X size={18} />
          )}
        </span>
        <span
          className={cn(
            'feedback-text',
            isRevealResult && 'revealed',
            isSuccess && 'success',
            !isRevealResult && !isSuccess && 'error',
          )}
        >
          {feedbackMessage}
        </span>
      </div>
      {showRetry && (
        <Button variant="outline" onClick={onRetry} className="w-full">
          <RefreshCw size={16} />
          <span>{t('quiz.tryAgain')}</span>
        </Button>
      )}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes success-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-success-pulse {
          animation: success-pulse 0.3s ease-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-out;
        }
        @keyframes icon-pop {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .animate-icon-pop {
          animation: icon-pop 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
