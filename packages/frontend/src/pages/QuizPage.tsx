import { useState, useRef, useEffect, useCallback } from 'react';
import type { SubmissionResult, QuizQuestion, RevealResult } from '@lingua-quiz/core';
import type { QuizFeedback } from '@api/types';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { useQuizStore } from '@features/quiz/stores/quiz.store';
import { ttsService } from '@features/quiz/services/tts-service';
import { useLevelWordLists, useUiPreferences } from '@features/quiz/hooks';
import {
  QuizHeader,
  QuestionDisplay,
  AnswerInput,
  FeedbackDisplay,
  UsageExamples,
  LearningProgress,
  LevelChangeAnimation,
  TTSButton,
  UserActions,
  QuizWelcome,
  QuizSkeleton,
  type AnswerInputRef,
} from '@features/quiz/components';
import { FeedCard, ErrorDisplay, useToast } from '@shared/components';
import { logger, extractErrorMessage, isTouchDevice } from '@shared/utils';
import { requestWakeLock, releaseWakeLock, reacquireWakeLockOnVisibilityChange } from '@shared/pwa';

export function QuizPage(): React.JSX.Element {
  const toast = useToast();

  const token = useAuthStore((state) => state.token);
  const username = useAuthStore((state) => state.username);

  const wordLists = useQuizStore((state) => state.wordLists);
  const selectedQuiz = useQuizStore((state) => state.selectedQuiz);
  const quizManager = useQuizStore((state) => state.quizManager);
  const currentQuestion = useQuizStore((state) => state.currentQuestion);
  const loading = useQuizStore((state) => state.loading);

  const loadWordLists = useQuizStore((state) => state.loadWordLists);
  const startQuiz = useQuizStore((state) => state.startQuiz);
  const getNextQuestion = useQuizStore((state) => state.getNextQuestion);
  const submitAnswer = useQuizStore((state) => state.submitAnswer);
  const revealAnswer = useQuizStore((state) => state.revealAnswer);
  const reset = useQuizStore((state) => state.reset);
  const saveAndCleanup = useQuizStore((state) => state.saveAndCleanup);
  const flushImmediately = useQuizStore((state) => state.flushImmediately);
  const restorePending = useQuizStore((state) => state.restorePending);
  const hasPendingChanges = useQuizStore((state) => state.hasPendingChanges);
  const setSaveErrorCallback = useQuizStore((state) => state.setSaveErrorCallback);

  const levelWordLists = useLevelWordLists(quizManager);
  const { foldedLists, toggleFold } = useUiPreferences();

  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<SubmissionResult | QuizFeedback | RevealResult | null>(null);
  const [usageExamples, setUsageExamples] = useState<{ source: string; target: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionForFeedback, setQuestionForFeedback] = useState<QuizQuestion | null>(null);
  const [showLevelAnimation, setShowLevelAnimation] = useState(false);
  const [isLevelUp, setIsLevelUp] = useState(true);
  const [levelChangeFrom, setLevelChangeFrom] = useState<string | undefined>(undefined);
  const [levelChangeTo, setLevelChangeTo] = useState<string | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSelectedQuiz, setLastSelectedQuiz] = useState<string | null>(null);
  const [awaitingNextInput, setAwaitingNextInput] = useState(false);

  const answerInputRef = useRef<AnswerInputRef>(null);
  const showProgress = true;

  const direction = currentQuestion?.direction ?? 'normal';
  const sourceLanguage =
    currentQuestion?.sourceLanguage ?? quizManager?.getState().translations[0]?.sourceLanguage ?? '';
  const targetLanguage =
    currentQuestion?.targetLanguage ?? quizManager?.getState().translations[0]?.targetLanguage ?? '';
  const currentLevel = quizManager?.getState().currentLevel ?? 'LEVEL_1';
  const currentLanguage = direction === 'normal' ? sourceLanguage : targetLanguage;

  const resetQuizSession = useCallback((clearAnswer = true) => {
    setFeedback(null);
    if (clearAnswer) setUserAnswer('');
    setQuestionForFeedback(null);
    setAwaitingNextInput(false);
  }, []);

  const handleValueChange = useCallback(
    (v: string): void => {
      if (awaitingNextInput) {
        setFeedback(null);
        setQuestionForFeedback(null);
        setAwaitingNextInput(false);
      }
      setUserAnswer(v);
    },
    [awaitingNextInput],
  );

  const handleSkip = useCallback((): void => {
    if (currentQuestion === null || isSubmitting) return;
    setQuestionForFeedback(currentQuestion);
    const result = revealAnswer();
    if (result !== null) {
      setFeedback(result);
      setAwaitingNextInput(true);
      setUsageExamples({
        source: result.translation.sourceUsageExample ?? '',
        target: result.translation.targetUsageExample ?? '',
      });
      setUserAnswer('');
      getNextQuestion();
      answerInputRef.current?.focus();
    }
  }, [currentQuestion, isSubmitting, revealAnswer, getNextQuestion]);

  const handleQuizSelect = useCallback(
    async (quiz: string): Promise<void> => {
      reset();
      resetQuizSession();

      if (quiz === '') return;

      setLastSelectedQuiz(quiz);

      try {
        if (token !== null) {
          await startQuiz(token, quiz);
          const question = getNextQuestion();
          if (question === null) {
            setFeedback({ message: 'No questions available for this quiz.', isSuccess: false });
          }
          if (!isTouchDevice()) answerInputRef.current?.focus();
          await requestWakeLock();
        }
      } catch (error: unknown) {
        logger.error('Failed to start quiz:', error);
        setFeedback({
          message: extractErrorMessage(error, 'Failed to start quiz. Please try again.'),
          isSuccess: false,
        });
      }
    },
    [token, reset, resetQuizSession, startQuiz, getNextQuestion],
  );

  const retryLastOperation = useCallback((): void => {
    if (lastSelectedQuiz !== null && selectedQuiz === null) {
      void handleQuizSelect(lastSelectedQuiz);
    }
  }, [lastSelectedQuiz, selectedQuiz, handleQuizSelect]);

  const handleBackToMenu = useCallback(async (): Promise<void> => {
    if (token !== null && quizManager !== null) {
      try {
        await saveAndCleanup(token);
      } catch (error: unknown) {
        logger.error('Failed to save progress before returning to menu:', error);
        toast.error('Could not save all progress.');
      }
    }
    reset();
    resetQuizSession();
    await releaseWakeLock();
  }, [token, quizManager, reset, resetQuizSession, saveAndCleanup, toast]);

  const handleSubmitAnswer = useCallback(async (): Promise<void> => {
    if (currentQuestion === null || isSubmitting || token === null) return;

    setIsSubmitting(true);
    setQuestionForFeedback(currentQuestion);

    try {
      const result = await submitAnswer(token, userAnswer);

      if (result !== null) {
        setFeedback(result);
        setAwaitingNextInput(true);
        if ('translation' in result && result.translation !== undefined) {
          const hasExamples =
            result.translation.sourceUsageExample !== undefined || result.translation.targetUsageExample !== undefined;
          if (hasExamples) {
            setUsageExamples({
              source: result.translation.sourceUsageExample ?? '',
              target: result.translation.targetUsageExample ?? '',
            });
          }
        }

        if ('levelChange' in result && result.levelChange !== undefined) {
          const fromNum = parseInt(result.levelChange.from.replace('LEVEL_', ''));
          const toNum = parseInt(result.levelChange.to.replace('LEVEL_', ''));
          setIsLevelUp(toNum > fromNum);
          setLevelChangeFrom(result.levelChange.from);
          setLevelChangeTo(result.levelChange.to);
          setShowLevelAnimation(true);
        }

        setUserAnswer('');
        getNextQuestion();
        answerInputRef.current?.focus();
      }
    } catch (error: unknown) {
      logger.error('Error submitting answer:', error);
      setFeedback({ message: extractErrorMessage(error, 'Error submitting answer.'), isSuccess: false });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentQuestion, isSubmitting, token, userAnswer, submitAnswer, getNextQuestion]);

  const handleLoadWordLists = useCallback(async (): Promise<void> => {
    if (token === null) return;

    setLoadError(null);
    try {
      await loadWordLists(token);
    } catch (error: unknown) {
      logger.error('Failed to load word lists:', error);
      setLoadError(extractErrorMessage(error, 'Failed to load quizzes'));
    }
  }, [token, loadWordLists]);

  useEffect(() => {
    setSaveErrorCallback((message: string) => {
      toast.error(message);
    });

    ttsService.setErrorCallback((message: string) => {
      toast.error(message);
    });

    const initialize = async () => {
      if (token !== null) {
        await Promise.all([restorePending(token), ttsService.initializeLanguages(token), handleLoadWordLists()]);
      }
      if (!isTouchDevice()) answerInputRef.current?.focus();
    };

    void initialize().catch((error) => {
      logger.error('Failed to initialize quiz:', error);
    });

    return () => {
      ttsService.destroy();
    };
  }, [token, restorePending, handleLoadWordLists, setSaveErrorCallback, toast]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (token !== null && hasPendingChanges()) {
        flushImmediately(token, true);
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleVisibilityChange = async (): Promise<void> => {
      if (document.hidden && token !== null && quizManager !== null) {
        flushImmediately(token, true);
      }

      if (!document.hidden && selectedQuiz !== null) {
        await reacquireWakeLockOnVisibilityChange();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', () => {
      void handleVisibilityChange();
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', () => {
        void handleVisibilityChange();
      });
    };
  }, [token, quizManager, selectedQuiz, hasPendingChanges, flushImmediately]);

  useEffect(() => {
    if (answerInputRef.current !== null && currentQuestion !== null && !isTouchDevice()) {
      answerInputRef.current.focus();
    }
  }, [currentQuestion]);

  return (
    <>
      <main id="main-content" className="feed">
        {selectedQuiz === null && (
          <FeedCard title={null}>
            <QuizWelcome />
          </FeedCard>
        )}

        <FeedCard title={null}>
          <div className="stack">
            <QuizHeader
              wordLists={wordLists}
              selectedQuiz={selectedQuiz}
              loading={loading}
              onSelect={handleQuizSelect}
              onBackToMenu={() => {
                void handleBackToMenu();
              }}
            />
            {loadError !== null && selectedQuiz === null && (
              <ErrorDisplay
                message={loadError}
                onRetry={() => {
                  void handleLoadWordLists();
                }}
                retryLabel="Reload quizzes"
              />
            )}
          </div>
        </FeedCard>

        {selectedQuiz !== null && loading && currentQuestion === null ? (
          <QuizSkeleton />
        ) : (
          <>
            {selectedQuiz !== null && (
              <FeedCard
                dense
                title="Translate"
                headerAction={
                  currentQuestion !== null && token !== null ? (
                    <TTSButton
                      key={currentQuestion.questionText}
                      token={token}
                      text={currentQuestion.questionText}
                      language={currentLanguage}
                    />
                  ) : undefined
                }
              >
                <QuestionDisplay currentQuestion={currentQuestion} levelWordLists={levelWordLists} />
              </FeedCard>
            )}

            {currentQuestion !== null && (
              <FeedCard dense>
                <AnswerInput
                  ref={answerInputRef}
                  value={userAnswer}
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  onSubmit={() => {
                    void handleSubmitAnswer();
                  }}
                  onValueChange={handleValueChange}
                  onSkip={handleSkip}
                />
                {feedback !== null && (
                  <FeedbackDisplay
                    feedback={feedback}
                    questionForFeedback={questionForFeedback}
                    onRetry={retryLastOperation}
                  />
                )}
                {usageExamples !== null && <UsageExamples examples={usageExamples} />}
              </FeedCard>
            )}

            {selectedQuiz !== null && showProgress && (
              <FeedCard>
                <LearningProgress
                  selectedQuiz={selectedQuiz}
                  currentLevel={currentLevel}
                  sourceLanguage={sourceLanguage}
                  targetLanguage={targetLanguage}
                  levelWordLists={levelWordLists}
                  foldedLists={foldedLists}
                  onToggleFold={toggleFold}
                />
              </FeedCard>
            )}
          </>
        )}

        {selectedQuiz === null && (
          <FeedCard dense>
            <UserActions username={username} />
          </FeedCard>
        )}
      </main>

      <LevelChangeAnimation
        isVisible={showLevelAnimation}
        isLevelUp={isLevelUp}
        fromLevel={levelChangeFrom}
        toLevel={levelChangeTo}
        onComplete={() => {
          setShowLevelAnimation(false);
        }}
      />
    </>
  );
}
