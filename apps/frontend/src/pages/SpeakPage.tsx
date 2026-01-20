import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Settings } from 'lucide-react';
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
import type { PronunciationScores, WordAssessment, AssessmentFeedback } from '@features/speak/types';
import { Button, Input, Label } from '@shared/ui';

export function SpeakPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { azureApiKey, azureRegion, recordAttempt } = useSpeakStore();
  const hasAzureCredentials = useHasAzureCredentials();
  const passThreshold = usePassThreshold();
  const language = useSpeakLanguage();

  const [practiceText, setPracticeText] = useState('Hello, how are you today?');
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

  const handleRecordingComplete = async (blob: Blob) => {
    if (!practiceText.trim()) return;

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
    <main className="speak-page">
      <div className="speak-container">
        <header className="speak-header">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void navigate('/');
            }}
            className="self-start"
          >
            <ArrowLeft size={18} />
            <span>{t('nav.back')}</span>
          </Button>
          <div className="speak-header-row">
            <h1>{t('speak.title', 'I Speak')}</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                void navigate('/settings');
              }}
              title={t('settings.title')}
            >
              <Settings size={20} />
            </Button>
          </div>
          <p className="text-muted-foreground">{t('speak.subtitle', 'Practice your pronunciation')}</p>
        </header>

        <div className="speak-content">
          <div className="speak-main">
            {!hasAzureCredentials && (
              <div className="speak-warning">
                Azure API key not configured. Using simulated scores.{' '}
                <button
                  onClick={() => {
                    void navigate('/settings');
                  }}
                  className="speak-warning-link"
                >
                  Configure
                </button>
              </div>
            )}

            <div className="speak-input-section">
              <Label htmlFor="practice-text">{t('speak.textLabel', 'Text to practice')}</Label>
              <Input
                id="practice-text"
                value={practiceText}
                onChange={(e) => {
                  setPracticeText(e.target.value);
                  resetState();
                }}
                placeholder={t('speak.textPlaceholder', 'Enter text to practice...')}
                disabled={isRecording || isProcessing}
              />
            </div>

            <div className="speak-text-display">
              <p className="speak-text">{practiceText || t('speak.textPlaceholder', 'Enter text to practice...')}</p>
              {wordAssessments.length > 0 && (
                <div className="speak-word-scores">
                  {wordAssessments.map((wa, idx) => (
                    <span
                      key={idx}
                      className={`speak-word ${wa.accuracyScore >= passThreshold ? 'good' : 'needs-work'}`}
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
              disabled={isProcessing || !practiceText.trim()}
              onRecordingStateChange={handleRecordingStateChange}
              toggleRef={toggleRecordingRef}
            />

            {isProcessing && (
              <div className="speak-processing">
                <div className="speak-spinner" />
                <p>{t('speak.analyzing', 'Analyzing pronunciation...')}</p>
              </div>
            )}

            {error && <div className="speak-error">{error}</div>}

            <p className="speak-hint">{t('speak.hint', 'Space: record/stop')}</p>
          </div>

          <div className="speak-sidebar">
            <ScoreCard scores={scores} threshold={passThreshold} passed={feedback?.passed} />

            {feedback && (
              <div className={`speak-feedback ${feedback.passed ? 'passed' : 'needs-work'}`}>
                <p className="speak-feedback-message">{feedback.message}</p>
                {feedback.suggestion && <p className="speak-feedback-suggestion">{feedback.suggestion}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
