import { useState, useCallback, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SubmissionResult, QuizQuestion, RevealResult } from '@lingua-quiz/core';
import type { QuizFeedback } from '@api/types';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { useQuizStore } from '@features/quiz/stores/quiz.store';
import type { AnswerInputRef } from '@features/quiz/components';
import { useToast } from '@shared/components';
import { logger, extractErrorMessage, isTouchDevice } from '@shared/utils';
import { requestWakeLock, releaseWakeLock } from '@shared/pwa';
import { useQuizFeedback } from './useQuizFeedback';
import { useQuizLevelAnimation } from './useQuizLevelAnimation';
import { useQuizInput } from './useQuizInput';

type FeedbackState = SubmissionResult | QuizFeedback | RevealResult | null;

interface QuizSessionState {
  userAnswer: string;
  submittedAnswer: string;
  feedback: FeedbackState;
  usageExamples: { source: string; target: string } | null;
  isSubmitting: boolean;
  questionForFeedback: QuizQuestion | null;
  awaitingNextInput: boolean;
  showLevelAnimation: boolean;
  isLevelUp: boolean;
  levelChangeFrom: string | undefined;
  levelChangeTo: string | undefined;
  loadError: string | null;
  lastSelectedQuiz: string | null;
}

interface QuizSessionActions {
  setUserAnswer: (value: string) => void;
  resetQuizSession: (clearAnswer?: boolean) => void;
  handleValueChange: (v: string) => void;
  handleSkip: () => void;
  handleQuizSelect: (quiz: string) => Promise<void>;
  retryLastOperation: () => void;
  handleBackToMenu: () => Promise<void>;
  handleSubmitAnswer: () => Promise<void>;
  handleLoadWordLists: () => Promise<void>;
  handleBackToMenuClick: () => void;
  handleRetryLoadClick: () => void;
  handleSubmitClick: () => void;
  handleLevelAnimationComplete: () => void;
}

export function useQuizSession(
  answerInputRef: RefObject<AnswerInputRef | null>,
): QuizSessionState & QuizSessionActions {
  const navigate = useNavigate();
  const toast = useToast();

  const token = useAuthStore((state) => state.token);

  const currentQuestion = useQuizStore((state) => state.currentQuestion);
  const loadWordLists = useQuizStore((state) => state.loadWordLists);
  const startQuiz = useQuizStore((state) => state.startQuiz);
  const getNextQuestion = useQuizStore((state) => state.getNextQuestion);
  const submitAnswer = useQuizStore((state) => state.submitAnswer);
  const revealAnswer = useQuizStore((state) => state.revealAnswer);
  const reset = useQuizStore((state) => state.reset);
  const saveAndCleanup = useQuizStore((state) => state.saveAndCleanup);
  const quizManager = useQuizStore((state) => state.quizManager);

  const fb = useQuizFeedback();
  const levelAnim = useQuizLevelAnimation();
  const input = useQuizInput(fb.resetFeedback);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSelectedQuiz, setLastSelectedQuiz] = useState<string | null>(null);

  const resetQuizSession = useCallback(
    (clearAnswer = true) => {
      fb.resetFeedback();
      if (clearAnswer) input.setUserAnswer('');
      input.setAwaitingNextInput(false);
    },
    [fb, input],
  );

  const applyResultExamples = useCallback(
    (result: { translation: { sourceUsageExample?: string | null; targetUsageExample?: string | null } }) => {
      const source = result.translation.sourceUsageExample ?? '';
      const target = result.translation.targetUsageExample ?? '';
      const hasExamples = source !== '' || target !== '';
      if (hasExamples) {
        fb.setUsageExamples({ source, target });
      }
    },
    [fb],
  );

  const applyLevelChange = useCallback(
    (result: { levelChange?: { from: string; to: string } }) => {
      if (result.levelChange !== undefined) {
        levelAnim.triggerLevelAnimation(result.levelChange);
      }
    },
    [levelAnim],
  );

  const handleSkip = useCallback((): void => {
    if (currentQuestion === null || fb.isSubmitting || token === null) return;
    fb.setQuestionForFeedback(currentQuestion);
    fb.setSubmittedAnswer('');
    const result = revealAnswer(token);
    if (result !== null) {
      fb.setFeedback(result);
      input.setAwaitingNextInput(true);
      fb.setUsageExamples({
        source: result.translation.sourceUsageExample ?? '',
        target: result.translation.targetUsageExample ?? '',
      });
      applyLevelChange(result);
      input.setUserAnswer('');
      getNextQuestion();
      answerInputRef.current?.focus();
    }
  }, [currentQuestion, fb, token, revealAnswer, input, applyLevelChange, getNextQuestion, answerInputRef]);

  const handleQuizSelect = useCallback(
    async (quiz: string): Promise<void> => {
      reset();
      resetQuizSession();
      if (quiz === '') return;
      setLastSelectedQuiz(quiz);
      try {
        if (token !== null) {
          await startQuiz(token, quiz);
          if (!isTouchDevice()) answerInputRef.current?.focus();
          await requestWakeLock();
        }
      } catch (error: unknown) {
        logger.error('Failed to start quiz:', error);
        fb.setFeedback({
          message: extractErrorMessage(error, 'Failed to start quiz. Please try again.'),
          isSuccess: false,
        });
      }
    },
    [token, reset, resetQuizSession, startQuiz, answerInputRef, fb],
  );

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
    void navigate('/');
  }, [token, quizManager, reset, resetQuizSession, saveAndCleanup, toast, navigate]);

  const handleSubmitAnswer = useCallback(async (): Promise<void> => {
    if (currentQuestion === null || fb.isSubmitting || token === null) return;
    fb.setIsSubmitting(true);
    fb.setQuestionForFeedback(currentQuestion);
    fb.setLastFailedAnswer(null);
    fb.setSubmittedAnswer(input.userAnswer);
    try {
      const result = await submitAnswer(token, input.userAnswer);
      if (result !== null) {
        if (
          'isCorrect' in result &&
          'vibrate' in navigator &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          navigator.vibrate(result.isCorrect ? [50] : [50, 30, 50]);
        }
        fb.setFeedback(result);
        input.setAwaitingNextInput(true);
        if ('translation' in result) {
          applyResultExamples(result);
        }
        if ('levelChange' in result) {
          applyLevelChange(result);
        }
        input.setUserAnswer('');
        getNextQuestion();
        answerInputRef.current?.focus();
      }
    } catch (error: unknown) {
      logger.error('Error submitting answer:', error);
      fb.setFeedback({ message: extractErrorMessage(error, 'Error submitting answer.'), isSuccess: false });
      fb.setLastFailedAnswer(input.userAnswer);
    } finally {
      fb.setIsSubmitting(false);
    }
  }, [
    currentQuestion,
    fb,
    token,
    input,
    submitAnswer,
    applyResultExamples,
    applyLevelChange,
    getNextQuestion,
    answerInputRef,
  ]);

  const retryLastOperation = useCallback((): void => {
    if (fb.lastFailedAnswer !== null && currentQuestion !== null) {
      input.setUserAnswer(fb.lastFailedAnswer);
      fb.setLastFailedAnswer(null);
      fb.setFeedback(null);
      void handleSubmitAnswer();
    } else if (lastSelectedQuiz !== null) {
      void handleQuizSelect(lastSelectedQuiz);
    }
  }, [fb, currentQuestion, input, lastSelectedQuiz, handleQuizSelect, handleSubmitAnswer]);

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

  const handleBackToMenuClick = useCallback(() => {
    void handleBackToMenu();
  }, [handleBackToMenu]);

  const handleRetryLoadClick = useCallback(() => {
    void handleLoadWordLists();
  }, [handleLoadWordLists]);

  const handleSubmitClick = useCallback(() => {
    void handleSubmitAnswer();
  }, [handleSubmitAnswer]);

  return {
    userAnswer: input.userAnswer,
    submittedAnswer: fb.submittedAnswer,
    feedback: fb.feedback,
    usageExamples: fb.usageExamples,
    isSubmitting: fb.isSubmitting,
    questionForFeedback: fb.questionForFeedback,
    awaitingNextInput: input.awaitingNextInput,
    showLevelAnimation: levelAnim.showLevelAnimation,
    isLevelUp: levelAnim.isLevelUp,
    levelChangeFrom: levelAnim.levelChangeFrom,
    levelChangeTo: levelAnim.levelChangeTo,
    loadError,
    lastSelectedQuiz,
    setUserAnswer: input.setUserAnswer,
    resetQuizSession,
    handleValueChange: input.handleValueChange,
    handleSkip,
    handleQuizSelect,
    retryLastOperation,
    handleBackToMenu,
    handleSubmitAnswer,
    handleLoadWordLists,
    handleBackToMenuClick,
    handleRetryLoadClick,
    handleSubmitClick,
    handleLevelAnimationComplete: levelAnim.handleLevelAnimationComplete,
  };
}
