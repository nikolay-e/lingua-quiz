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

type FeedbackState = SubmissionResult | QuizFeedback | RevealResult | null;

interface QuizSessionState {
  userAnswer: string;
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

export type QuizSession = QuizSessionState & QuizSessionActions;

export function useQuizSession(answerInputRef: RefObject<AnswerInputRef | null>): QuizSession {
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

  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [usageExamples, setUsageExamples] = useState<{ source: string; target: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionForFeedback, setQuestionForFeedback] = useState<QuizQuestion | null>(null);
  const [showLevelAnimation, setShowLevelAnimation] = useState(false);
  const [isLevelUp, setIsLevelUp] = useState(true);
  const [levelChangeFrom, setLevelChangeFrom] = useState<string | undefined>(undefined);
  const [levelChangeTo, setLevelChangeTo] = useState<string | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSelectedQuiz, setLastSelectedQuiz] = useState<string | null>(null);
  const [lastFailedAnswer, setLastFailedAnswer] = useState<string | null>(null);
  const [awaitingNextInput, setAwaitingNextInput] = useState(false);

  const resetQuizSession = useCallback((clearAnswer = true) => {
    setFeedback(null);
    if (clearAnswer) setUserAnswer('');
    setQuestionForFeedback(null);
    setUsageExamples(null);
    setAwaitingNextInput(false);
  }, []);

  const handleValueChange = useCallback(
    (v: string): void => {
      if (awaitingNextInput) {
        setFeedback(null);
        setQuestionForFeedback(null);
        setUsageExamples(null);
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
  }, [currentQuestion, isSubmitting, revealAnswer, getNextQuestion, answerInputRef]);

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
        setFeedback({
          message: extractErrorMessage(error, 'Failed to start quiz. Please try again.'),
          isSuccess: false,
        });
      }
    },
    [token, reset, resetQuizSession, startQuiz, answerInputRef],
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
    if (currentQuestion === null || isSubmitting || token === null) return;

    setIsSubmitting(true);
    setQuestionForFeedback(currentQuestion);
    setLastFailedAnswer(null);

    try {
      const result = await submitAnswer(token, userAnswer);

      if (result !== null) {
        if (
          'isCorrect' in result &&
          'vibrate' in navigator &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          navigator.vibrate(result.isCorrect ? [50] : [50, 30, 50]);
        }
        setFeedback(result);
        setAwaitingNextInput(true);
        if ('translation' in result) {
          const { sourceUsageExample, targetUsageExample } = result.translation;
          const source = sourceUsageExample ?? '';
          const target = targetUsageExample ?? '';
          const hasExamples = source !== '' || target !== '';
          if (hasExamples) {
            setUsageExamples({ source, target });
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
      setLastFailedAnswer(userAnswer);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentQuestion, isSubmitting, token, userAnswer, submitAnswer, getNextQuestion, answerInputRef]);

  const retryLastOperation = useCallback((): void => {
    if (lastFailedAnswer !== null && currentQuestion !== null) {
      setUserAnswer(lastFailedAnswer);
      setLastFailedAnswer(null);
      setFeedback(null);
      void handleSubmitAnswer();
    } else if (lastSelectedQuiz !== null) {
      void handleQuizSelect(lastSelectedQuiz);
    }
  }, [lastFailedAnswer, currentQuestion, lastSelectedQuiz, handleQuizSelect, handleSubmitAnswer]);

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

  const handleLevelAnimationComplete = useCallback(() => {
    setShowLevelAnimation(false);
  }, []);

  return {
    userAnswer,
    feedback,
    usageExamples,
    isSubmitting,
    questionForFeedback,
    awaitingNextInput,
    showLevelAnimation,
    isLevelUp,
    levelChangeFrom,
    levelChangeTo,
    loadError,
    lastSelectedQuiz,
    setUserAnswer,
    resetQuizSession,
    handleValueChange,
    handleSkip,
    handleQuizSelect,
    retryLastOperation,
    handleBackToMenu,
    handleSubmitAnswer,
    handleLoadWordLists,
    handleBackToMenuClick,
    handleRetryLoadClick,
    handleSubmitClick,
    handleLevelAnimationComplete,
  };
}
