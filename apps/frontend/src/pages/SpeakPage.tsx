import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Settings, Shuffle } from 'lucide-react';
import { AudioRecorder } from '@features/speak/components/AudioRecorder';
import { ScoreCard } from '@features/speak/components/ScoreCard';
import {
  useSpeakStore,
  useHasAzureCredentials,
  usePassThreshold,
  useSpeakLanguage,
} from '@features/speak/stores/speak.store';
import { assessPronunciation, generateSimulatedAssessment } from '@features/speak/services/azure-speech';
import { getAssessmentFeedback } from '@features/speak/lib/feedback';
import { getDefaultPhrase, getRandomPhrase } from '@features/speak/lib/phrases';
import type { PronunciationScores, WordAssessment, AssessmentFeedback } from '@features/speak/types';
import { cn } from '@shared/utils';
import { Button, Input, Label } from '@shared/ui';
import { PageContainer } from '@shared/components';
import { requestWakeLock, releaseWakeLock } from '@shared/pwa';

export function SpeakPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { azureApiKey, azureRegion, recordAttempt } = useSpeakStore();
  const hasAzureCredentials = useHasAzureCredentials();
  const passThreshold = usePassThreshold();
  const language = useSpeakLanguage();

  const [practiceText, setPracticeText] = useState(() => getDefaultPhrase(language));
  const [scores, setScores] = useState<PronunciationScores | null>(null);
  const [wordAssessments, setWordAssessments] = useState<WordAssessment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<AssessmentFeedback | null>(null);

  const toggleRecordingRef = useRef<(() => void) | null>(null);

  const resetState = useCallback(() => {
    setScores(null);
    setWordAssessments([]);
    setError(null);
    setFeedback(null);
  }, []);

  const handleRecordingStateChange = useCallback((recording: boolean) => {
    setIsRecording(recording);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleRecordingRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    void requestWakeLock();
    return () => {
      void releaseWakeLock();
    };
  }, []);

  useEffect(() => {
    setPracticeText(getDefaultPhrase(language));
    resetState();
  }, [language, resetState]);

  const handleRandomPhrase = useCallback(() => {
    setPracticeText(getRandomPhrase(language));
    resetState();
  }, [language, resetState]);

  const handleRecordingComplete = async (blob: Blob) => {
    if (practiceText.trim() === '') return;

    setIsProcessing(true);
    setError(null);

    try {
      const cleanText = practiceText.trim();
      const result = hasAzureCredentials
        ? await assessPronunciation(blob, cleanText, azureApiKey, azureRegion, language)
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
    <PageContainer maxWidth="4xl">
      <header className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void navigate('/');
          }}
          className="self-start"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>{t('nav.back')}</span>
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('speak.title', 'I Speak')}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              void navigate('/settings');
            }}
            aria-label={t('settings.title')}
          >
            <Settings size={20} aria-hidden="true" />
          </Button>
        </div>
        <p className="text-muted-foreground">{t('speak.subtitle', 'Practice your pronunciation')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
        <div className="flex flex-col gap-4">
          {!hasAzureCredentials && (
            <div className="bg-secondary/20 border border-secondary/30 rounded-lg p-3 text-sm text-secondary-foreground">
              Azure API key not configured. Using simulated scores.{' '}
              <button
                onClick={() => {
                  void navigate('/settings');
                }}
                className="text-primary hover:underline font-medium bg-transparent border-none cursor-pointer transition-colors"
              >
                Configure
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="practice-text">{t('speak.textLabel', 'Text to practice')}</Label>
            <div className="flex gap-2">
              <Input
                id="practice-text"
                value={practiceText}
                onChange={(e) => {
                  setPracticeText(e.target.value);
                  resetState();
                }}
                placeholder={t('speak.textPlaceholder', 'Enter text to practice...')}
                disabled={isRecording || isProcessing}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleRandomPhrase}
                disabled={isRecording || isProcessing}
                aria-label={t('speak.randomPhrase', 'Random phrase')}
                title={t('speak.randomPhrase', 'Random phrase')}
              >
                <Shuffle size={18} aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 min-h-20">
            <p className="text-lg font-medium text-center">
              {practiceText !== '' ? practiceText : t('speak.textPlaceholder', 'Enter text to practice...')}
            </p>
            {wordAssessments.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                {wordAssessments.map((wa) => (
                  <span
                    key={wa.word}
                    className={cn(
                      'px-2 py-1 rounded text-sm font-medium',
                      wa.accuracyScore >= passThreshold ? 'bg-success/20 text-success' : 'bg-error/20 text-error',
                    )}
                    title={`${Math.round(wa.accuracyScore)}%`}
                  >
                    {wa.word}
                  </span>
                ))}
              </div>
            )}
          </div>

          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            disabled={isProcessing || practiceText.trim() === ''}
            onRecordingStateChange={handleRecordingStateChange}
            toggleRef={toggleRecordingRef}
          />

          {isProcessing && (
            <div className="flex items-center justify-center gap-3 p-4">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">{t('speak.analyzing', 'Analyzing pronunciation...')}</p>
            </div>
          )}

          {error !== null && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-3 text-sm text-error">{error}</div>
          )}

          <p className="text-center text-xs text-muted-foreground">{t('speak.hint', 'Space: record/stop')}</p>
        </div>

        <div className="flex flex-col gap-4">
          <ScoreCard scores={scores} threshold={passThreshold} passed={feedback?.passed} />

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
        </div>
      </div>
    </PageContainer>
  );
}
