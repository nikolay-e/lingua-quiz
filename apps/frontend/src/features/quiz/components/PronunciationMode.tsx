import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AudioRecorder } from '@features/speak/components/AudioRecorder';
import { ScoreCard } from '@features/speak/components/ScoreCard';
import { WordPhonemeDisplay } from '@features/speak/components/WordPhonemeDisplay';
import { useSpeakStore, usePassThreshold } from '@features/speak/stores/speak.store';
import { useIsAuthenticated } from '@features/auth/stores/auth.store';
import { assessPronunciationViaBackend } from '@api/speech';
import { generateSimulatedAssessment } from '@features/speak/services/simulation';
import { getAssessmentFeedback } from '@features/speak/lib/feedback';
import type { LanguageCode, PronunciationScores, WordAssessment, AssessmentFeedback } from '@features/speak/types';
import { Button } from '@shared/ui';
import { cn } from '@shared/utils';

interface PronunciationModeProps {
  questionText: string;
  language: LanguageCode;
  token: string;
  onContinue: () => void;
  onPronunciationPassed: () => void;
  onSkip: () => void;
}

export function PronunciationMode({
  questionText,
  language,
  token,
  onContinue,
  onPronunciationPassed,
  onSkip,
}: Readonly<PronunciationModeProps>): React.JSX.Element {
  const { t } = useTranslation();
  const isAuthenticated = useIsAuthenticated();
  const passThreshold = usePassThreshold();
  const { recordAttempt } = useSpeakStore();

  const [scores, setScores] = useState<PronunciationScores | null>(null);
  const [wordAssessments, setWordAssessments] = useState<WordAssessment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AssessmentFeedback | null>(null);

  const toggleRecordingRef = useRef<(() => void) | null>(null);
  const hasResult = scores !== null;

  const resetState = useCallback(() => {
    setScores(null);
    setWordAssessments([]);
    setError(null);
    setFeedback(null);
  }, []);

  useEffect(() => {
    resetState();
  }, [questionText, resetState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (hasResult) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggleRecordingRef.current?.();
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [hasResult]);

  const handleRecordingComplete = async (blob: Blob) => {
    if (questionText.trim() === '') return;
    setIsProcessing(true);
    setError(null);

    try {
      const cleanText = questionText.trim();
      const result = isAuthenticated
        ? await assessPronunciationViaBackend(blob, cleanText, language, token)
        : await (async () => {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            return generateSimulatedAssessment(cleanText);
          })();

      setScores(result.scores);
      setWordAssessments(result.wordAssessments);

      const minWordScore =
        result.wordAssessments.length > 0 ? Math.min(...result.wordAssessments.map((w) => w.accuracyScore)) : 100;
      const passed = result.scores.pronunciation >= passThreshold && minWordScore >= passThreshold;

      recordAttempt(cleanText, result.scores, passed);

      const assessmentFeedback = getAssessmentFeedback(result.scores, passThreshold, result.wordAssessments);
      setFeedback(assessmentFeedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assessment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!hasResult && (
        <AudioRecorder
          onRecordingComplete={handleRecordingComplete}
          disabled={isProcessing || questionText.trim() === ''}
          toggleRef={toggleRecordingRef}
        />
      )}

      {isProcessing && (
        <div className="flex items-center justify-center gap-3 p-4">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">{t('speak.analyzing', 'Analyzing pronunciation...')}</p>
        </div>
      )}

      {error !== null && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-3 text-sm text-error">{error}</div>
      )}

      {hasResult && (
        <>
          <ScoreCard scores={scores} threshold={passThreshold} passed={feedback?.passed} />
          <WordPhonemeDisplay wordAssessments={wordAssessments} threshold={passThreshold} />

          {feedback !== null && (
            <div
              className={cn(
                'rounded-lg p-4',
                feedback.passed
                  ? 'bg-success/10 border border-success/20'
                  : 'bg-secondary/10 border border-secondary/20',
              )}
            >
              <p className={cn('font-medium', feedback.passed ? 'text-success' : 'text-secondary-foreground')}>
                {feedback.message}
              </p>
              {feedback.suggestion !== undefined && feedback.suggestion !== '' && (
                <p className="text-sm text-muted-foreground mt-2">{feedback.suggestion}</p>
              )}
            </div>
          )}

          <Button className="w-full" onClick={feedback?.passed === true ? onPronunciationPassed : onContinue}>
            {t('quiz.continue', 'Continue')} →
          </Button>
        </>
      )}

      {!hasResult && !isProcessing && (
        <>
          <p className="text-center text-xs text-muted-foreground">{t('speak.hint', 'Space: record/stop')}</p>
          <Button variant="ghost" className="w-full" onClick={onSkip}>
            {t('quiz.skip', 'Skip')}
          </Button>
        </>
      )}
    </div>
  );
}
