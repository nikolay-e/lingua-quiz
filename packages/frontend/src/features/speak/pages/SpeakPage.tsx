import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Settings } from 'lucide-react';
import { AudioRecorder } from '../components/AudioRecorder';
import { ScoreCard } from '../components/ScoreCard';
import { useSpeakStore, useHasAzureCredentials, usePassThreshold, useSpeakLanguage } from '../stores/speak.store';
import { assessPronunciation, generateSimulatedAssessment } from '../services/azure-speech';
import { getAssessmentFeedback } from '../lib/feedback';
import type { PronunciationScores, WordAssessment, AssessmentFeedback } from '../types';
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
              navigate('/');
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
                navigate('/settings');
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
                    navigate('/settings');
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

      <style>{`
        .speak-page {
          min-height: 100vh;
          background-color: var(--color-background);
          padding: var(--spacing-md);
        }

        .speak-container {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .speak-header {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .speak-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .speak-header h1 {
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text);
          margin: 0;
        }

        .speak-content {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: var(--spacing-lg);
        }

        @media (width <= 768px) {
          .speak-content {
            grid-template-columns: 1fr;
          }
        }

        .speak-main {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .speak-warning {
          background: color-mix(in srgb, var(--color-warning) 20%, transparent);
          color: var(--color-warning);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm);
          text-align: center;
          font-size: var(--font-size-sm);
        }

        .speak-warning-link {
          background: none;
          border: none;
          text-decoration: underline;
          color: inherit;
          cursor: pointer;
        }

        .speak-input-section {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .speak-text-display {
          background: var(--color-card);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          text-align: center;
        }

        .speak-text {
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-medium);
          margin: 0;
          color: var(--color-text);
        }

        .speak-word-scores {
          margin-top: var(--spacing-md);
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: var(--spacing-xs);
        }

        .speak-word {
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
        }

        .speak-word.good {
          background: color-mix(in srgb, var(--color-success) 20%, transparent);
          color: var(--color-success);
        }

        .speak-word.needs-work {
          background: color-mix(in srgb, var(--color-error) 20%, transparent);
          color: var(--color-error);
        }

        .speak-processing {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-sm);
          color: var(--color-muted-foreground);
        }

        .speak-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--color-primary);
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .speak-error {
          background: color-mix(in srgb, var(--color-error) 20%, transparent);
          color: var(--color-error);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm);
          text-align: center;
          font-size: var(--font-size-sm);
        }

        .speak-hint {
          text-align: center;
          font-size: var(--font-size-xs);
          color: var(--color-muted-foreground);
          opacity: 0.5;
          margin: 0;
        }

        .speak-sidebar {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .speak-feedback {
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          text-align: center;
        }

        .speak-feedback.passed {
          background: color-mix(in srgb, var(--color-success) 20%, transparent);
        }

        .speak-feedback.needs-work {
          background: color-mix(in srgb, var(--color-warning) 20%, transparent);
        }

        .speak-feedback-message {
          font-weight: var(--font-weight-semibold);
          margin: 0;
        }

        .speak-feedback.passed .speak-feedback-message {
          color: var(--color-success);
        }

        .speak-feedback.needs-work .speak-feedback-message {
          color: var(--color-warning);
        }

        .speak-feedback-suggestion {
          font-size: var(--font-size-sm);
          color: var(--color-muted-foreground);
          margin: var(--spacing-xs) 0 0 0;
        }
      `}</style>
    </main>
  );
}
