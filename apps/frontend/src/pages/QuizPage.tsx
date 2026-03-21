import { useRef, useEffect } from 'react';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { useQuizStore } from '@features/quiz/stores/quiz.store';
import { ttsService } from '@features/quiz/services/tts-service';
import { useLevelWordLists, useQuizSession, useUiPreferences } from '@features/quiz/hooks';
import {
  QuizHeader,
  QuestionDisplay,
  AnswerInput,
  FeedbackDisplay,
  UsageExamples,
  LearningProgress,
  LevelChangeAnimation,
  TTSButton,
  QuizSkeleton,
  type AnswerInputRef,
} from '@features/quiz/components';
import { AppShell, FeedCard, ErrorDisplay, useToast } from '@shared/components';
import { logger, isTouchDevice } from '@shared/utils';
import { reacquireWakeLockOnVisibilityChange } from '@shared/pwa';

export function QuizPage(): React.JSX.Element {
  const toast = useToast();

  const token = useAuthStore((state) => state.token);

  const wordLists = useQuizStore((state) => state.wordLists);
  const selectedQuiz = useQuizStore((state) => state.selectedQuiz);
  const quizManager = useQuizStore((state) => state.quizManager);
  const currentQuestion = useQuizStore((state) => state.currentQuestion);
  const loading = useQuizStore((state) => state.loading);

  const flushImmediately = useQuizStore((state) => state.flushImmediately);
  const restorePending = useQuizStore((state) => state.restorePending);
  const hasPendingChanges = useQuizStore((state) => state.hasPendingChanges);
  const setSaveErrorCallback = useQuizStore((state) => state.setSaveErrorCallback);

  const levelWordLists = useLevelWordLists(quizManager);
  const { foldedLists, toggleFold } = useUiPreferences();

  const answerInputRef = useRef<AnswerInputRef>(null);

  const {
    userAnswer,
    submittedAnswer,
    feedback,
    usageExamples,
    isSubmitting,
    questionForFeedback,
    showLevelAnimation,
    isLevelUp,
    levelChangeFrom,
    levelChangeTo,
    loadError,
    handleValueChange,
    handleSkip,
    handleQuizSelect,
    retryLastOperation,
    handleBackToMenuClick,
    handleRetryLoadClick,
    handleSubmitClick,
    handleLevelAnimationComplete,
    handleLoadWordLists,
  } = useQuizSession(answerInputRef);

  const direction = currentQuestion?.direction ?? 'normal';
  const sourceLanguage =
    currentQuestion?.sourceLanguage ?? quizManager?.getState().translations[0]?.sourceLanguage ?? '';
  const targetLanguage =
    currentQuestion?.targetLanguage ?? quizManager?.getState().translations[0]?.targetLanguage ?? '';
  const currentLevel = quizManager?.getState().currentLevel ?? 'LEVEL_1';
  const currentLanguage = direction === 'normal' ? sourceLanguage : targetLanguage;

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
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handlePageHide = (): void => {
      if (token !== null && hasPendingChanges()) {
        flushImmediately(token, true);
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

    const visibilityHandler = (): void => {
      void handleVisibilityChange();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', visibilityHandler);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [token, quizManager, selectedQuiz, hasPendingChanges, flushImmediately]);

  useEffect(() => {
    if (answerInputRef.current !== null && currentQuestion !== null && !isTouchDevice()) {
      answerInputRef.current.focus();
    }
  }, [currentQuestion]);

  return (
    <>
      <AppShell className="max-w-210">
        <FeedCard>
          <div className="flex flex-col gap-4">
            <QuizHeader
              wordLists={wordLists}
              selectedQuiz={selectedQuiz}
              loading={loading}
              onSelect={handleQuizSelect}
              onBackToMenu={handleBackToMenuClick}
            />
            {loadError !== null && selectedQuiz === null && (
              <ErrorDisplay message={loadError} onRetry={handleRetryLoadClick} retryLabel="Reload quizzes" />
            )}
          </div>
        </FeedCard>

        {selectedQuiz !== null && loading && currentQuestion === null ? (
          <QuizSkeleton />
        ) : (
          selectedQuiz !== null && (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 md:gap-6">
              <div className="flex flex-col gap-4 md:gap-6">
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

                {currentQuestion !== null && (
                  <FeedCard dense>
                    <AnswerInput
                      ref={answerInputRef}
                      value={userAnswer}
                      disabled={isSubmitting}
                      isLoading={isSubmitting}
                      onSubmit={handleSubmitClick}
                      onValueChange={handleValueChange}
                      onSkip={handleSkip}
                    />
                    {feedback !== null && (
                      <FeedbackDisplay
                        feedback={feedback}
                        questionForFeedback={questionForFeedback}
                        submittedAnswer={submittedAnswer}
                        onRetry={retryLastOperation}
                      />
                    )}
                    {usageExamples !== null && (
                      <UsageExamples
                        examples={usageExamples}
                        sourceLanguage={sourceLanguage}
                        targetLanguage={targetLanguage}
                      />
                    )}
                  </FeedCard>
                )}
              </div>

              <aside className="flex flex-col gap-4 md:gap-6">
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
              </aside>
            </div>
          )
        )}
      </AppShell>

      <div aria-live="polite" className="sr-only">
        {currentQuestion !== null ? currentQuestion.questionText : ''}
      </div>

      <LevelChangeAnimation
        isVisible={showLevelAnimation}
        isLevelUp={isLevelUp}
        fromLevel={levelChangeFrom}
        toLevel={levelChangeTo}
        onComplete={handleLevelAnimationComplete}
      />
    </>
  );
}
