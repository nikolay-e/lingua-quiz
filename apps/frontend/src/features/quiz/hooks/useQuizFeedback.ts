import { useState, useCallback } from 'react';
import type { SubmissionResult, QuizQuestion, RevealResult } from '@lingua-quiz/core';
import type { QuizFeedback } from '@api/types';

export type FeedbackState = SubmissionResult | QuizFeedback | RevealResult | null;

export interface QuizFeedbackReturn {
  submittedAnswer: string;
  feedback: FeedbackState;
  usageExamples: { source: string; target: string } | null;
  questionForFeedback: QuizQuestion | null;
  isSubmitting: boolean;
  lastFailedAnswer: string | null;
  setSubmittedAnswer: (v: string) => void;
  setFeedback: (f: FeedbackState) => void;
  setUsageExamples: (e: { source: string; target: string } | null) => void;
  setQuestionForFeedback: (q: QuizQuestion | null) => void;
  setIsSubmitting: (v: boolean) => void;
  setLastFailedAnswer: (v: string | null) => void;
  resetFeedback: () => void;
}

export function useQuizFeedback(): QuizFeedbackReturn {
  const [submittedAnswer, setSubmittedAnswer] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [usageExamples, setUsageExamples] = useState<{ source: string; target: string } | null>(null);
  const [questionForFeedback, setQuestionForFeedback] = useState<QuizQuestion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFailedAnswer, setLastFailedAnswer] = useState<string | null>(null);

  const resetFeedback = useCallback(() => {
    setFeedback(null);
    setSubmittedAnswer('');
    setQuestionForFeedback(null);
    setUsageExamples(null);
  }, []);

  return {
    submittedAnswer,
    feedback,
    usageExamples,
    questionForFeedback,
    isSubmitting,
    lastFailedAnswer,
    setSubmittedAnswer,
    setFeedback,
    setUsageExamples,
    setQuestionForFeedback,
    setIsSubmitting,
    setLastFailedAnswer,
    resetFeedback,
  };
}
