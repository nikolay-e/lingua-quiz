import { useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { useQuizStore } from '@features/quiz/stores/quiz.store';
import { ttsService } from '@features/quiz/services/tts-service';
import { useLevelWordLists, usePronunciationQueue, useQuizSession, useUiPreferences } from '@features/quiz/hooks';
import {
  QuizHeader,
  QuestionDisplay,
  AnswerInput,
  FeedbackDisplay,
  UsageExamples,
  LearningProgress,
  LevelChangeAnimation,
  PronunciationMode,
  TTSButton,
  QuizSkeleton,
  type AnswerInputRef,
} from '@features/quiz/components';
import { SUPPORTED_SPEAK_LANGS } from '@features/speak';
import type { LanguageCode } from '@features/speak/types';
import { AppShell, FeedCard, ErrorDisplay, useToast } from '@shared/components';
import { Button } from '@shared/ui';
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
  const markPronunciationPassed = useQuizStore((state) => state.markPronunciationPassed);
  const autoSetPronunciationForUnsupportedLanguage = useQuizStore(
    (state) => state.autoSetPronunciationForUnsupportedLanguage,
  );

  const levelWordLists = useLevelWordLists(quizManager);
  const pronunciationQueue = usePronunciationQueue(quizManager);
  const { foldedLists, toggleFold, pronunciationMode, togglePronunciationMode } = useUiPreferences();

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
  const speakLanguage: LanguageCode | undefined = SUPPORTED_SPEAK_LANGS[sourceLanguage.toLowerCase()];
  const canPronounce = speakLanguage !== undefined;

  const pronunciationWord = pronunciationMode && canPronounce ? pronunciationQueue.currentWord : null;

  const handlePronunciationPassed = () => {
    if (token !== null && pronunciationWord !== null) {
      markPronunciationPassed(token, pronunciationWord.id);
    }
    pronunciationQueue.advance();
  };

  const handlePronunciationContinue = () => {
    if (pronunciationWord !== null) {
      pronunciationQueue.advance();
    } else {
      handleSkip();
    }
  };

  const handlePronunciationSkip = () => {
    if (pronunciationWord !== null) {
      pronunciationQueue.advance();
    } else {
      handleSkip();
    }
  };

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
    if (quizManager !== null && token !== null && !canPronounce) {
      autoSetPronunciationForUnsupportedLanguage(token);
    }
  }, [quizManager, token, canPronounce, autoSetPronunciationForUnsupportedLanguage]);

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
      <AppShell className="max-w-5xl">
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
                  title={
                    // eslint-disable-next-line no-nested-ternary
                    pronunciationMode && canPronounce
                      ? pronunciationWord !== null
                        ? 'Say this word'
                        : 'Pronunciation Complete'
                      : 'Translate'
                  }
                  headerAction={
                    currentQuestion !== null && token !== null ? (
                      <div className="flex items-center gap-1">
                        {canPronounce && (
                          <Button
                            variant={pronunciationMode ? 'default' : 'ghost'}
                            size="icon"
                            onClick={togglePronunciationMode}
                            aria-label={pronunciationMode ? 'Switch to typing' : 'Switch to pronunciation'}
                            aria-pressed={pronunciationMode}
                            className="h-8 w-8"
                          >
                            {pronunciationMode ? <MicOff size={16} /> : <Mic size={16} />}
                          </Button>
                        )}
                        {!(pronunciationMode && canPronounce) && (
                          <TTSButton
                            key={currentQuestion.questionText}
                            token={token}
                            text={currentQuestion.questionText}
                            language={currentLanguage}
                          />
                        )}
                      </div>
                    ) : undefined
                  }
                >
                  <QuestionDisplay
                    currentQuestion={currentQuestion}
                    levelWordLists={levelWordLists}
                    pronunciationMode={pronunciationMode && canPronounce}
                    pronunciationText={pronunciationWord?.sourceText}
                    pronunciationLanguage={pronunciationWord?.sourceLanguage}
                  />
                </FeedCard>

                {currentQuestion !== null && (
                  <FeedCard dense>
                    {/* eslint-disable-next-line no-nested-ternary */}
                    {pronunciationMode && speakLanguage !== undefined && token !== null ? (
                      pronunciationWord !== null ? (
                        <PronunciationMode
                          questionText={pronunciationWord.sourceText}
                          language={speakLanguage}
                          token={token}
                          onContinue={handlePronunciationContinue}
                          onPronunciationPassed={handlePronunciationPassed}
                          onSkip={handlePronunciationSkip}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 p-6 text-center">
                          <p className="text-lg font-medium text-success">All pronunciation complete!</p>
                          <p className="text-sm text-muted-foreground">
                            All mastered words have been pronounced. Switch back to translation mode to continue
                            learning.
                          </p>
                        </div>
                      )
                    ) : (
                      <>
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
                      </>
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
