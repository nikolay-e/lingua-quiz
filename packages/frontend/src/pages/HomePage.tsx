import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Languages, GraduationCap, BookOpen, Play, Mic, Settings } from 'lucide-react';
import type { WordList } from '@api/types';
import { Button, Select } from '@shared/ui';
import { FeedCard } from '@shared/components';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { useQuizStore } from '@features/quiz/stores/quiz.store';
import { useSpeakStore } from '@features/speak';
import { logger, extractErrorMessage } from '@shared/utils';

interface ParsedList {
  source: string;
  target: string;
  level: string;
  listName: string;
  wordCount: number;
}

function parseListName(list: WordList): ParsedList | null {
  const spaceMatch = list.listName.match(/^(\w+)\s+(\w+)\s+([A-Ca-c]\d)$/);
  const hyphenMatch = list.listName.match(/^(\w+)-(\w+)-([A-Ca-c]\d)$/);
  const match = spaceMatch ?? hyphenMatch;
  if (match === null || match[1] === undefined || match[2] === undefined || match[3] === undefined) return null;
  return {
    source: match[1].toLowerCase(),
    target: match[2].toLowerCase(),
    level: match[3].toLowerCase(),
    listName: list.listName,
    wordCount: list.wordCount,
  };
}

export function HomePage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const token = useAuthStore((state) => state.token);
  const wordLists = useQuizStore((state) => state.wordLists);
  const loading = useQuizStore((state) => state.loading);
  const loadWordLists = useQuizStore((state) => state.loadWordLists);
  const startQuiz = useQuizStore((state) => state.startQuiz);
  const reset = useQuizStore((state) => state.reset);
  const setSpeakLanguage = useSpeakStore((state) => state.setLanguage);

  const [selectedKnown, setSelectedKnown] = useState<string | undefined>(undefined);
  const [selectedLearning, setSelectedLearning] = useState<string | undefined>(undefined);
  const [selectedLevel, setSelectedLevel] = useState<string | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const parsedLists = useMemo(
    () => wordLists.map(parseListName).filter((p): p is ParsedList => p !== null),
    [wordLists],
  );

  const knownLanguages = useMemo(() => [...new Set(parsedLists.map((p) => p.target))].sort(), [parsedLists]);

  const learningLanguages = useMemo(() => {
    if (selectedKnown === undefined) return [];
    return [...new Set(parsedLists.filter((p) => p.target === selectedKnown).map((p) => p.source))].sort();
  }, [parsedLists, selectedKnown]);

  const availableLevels = useMemo(() => {
    if (selectedKnown === undefined || selectedLearning === undefined) return [];
    return parsedLists
      .filter((p) => p.target === selectedKnown && p.source === selectedLearning)
      .map((p) => ({ level: p.level, wordCount: p.wordCount }))
      .sort((a, b) => a.level.localeCompare(b.level));
  }, [parsedLists, selectedKnown, selectedLearning]);

  const selectedList = useMemo(() => {
    if (selectedKnown === undefined || selectedLearning === undefined || selectedLevel === undefined) return null;
    return parsedLists.find(
      (p) => p.target === selectedKnown && p.source === selectedLearning && p.level === selectedLevel,
    );
  }, [parsedLists, selectedKnown, selectedLearning, selectedLevel]);

  const handleKnownChange = (value: string) => {
    setSelectedKnown(value);
    setSelectedLearning(undefined);
    setSelectedLevel(undefined);
  };

  const handleLearningChange = (value: string) => {
    setSelectedLearning(value);
    setSelectedLevel(undefined);
  };

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
    void handleLoadWordLists();
  }, [handleLoadWordLists]);

  const handleLearnWords = async () => {
    if (selectedList === null || selectedList === undefined || token === null) return;

    reset();
    try {
      await startQuiz(token, selectedList.listName);
      navigate('/quiz');
    } catch (error: unknown) {
      logger.error('Failed to start quiz:', error);
    }
  };

  const handlePracticePronunciation = () => {
    if (selectedLearning === undefined) return;

    const langMap: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-BR',
      ru: 'ru-RU',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR',
    };
    const speakLang = langMap[selectedLearning] ?? 'en-US';
    setSpeakLanguage(speakLang as 'en-US' | 'fr-FR' | 'es-ES' | 'de-DE');
    navigate('/speak');
  };

  const formatLanguage = (code: string): string => t(`languages.${code}`);
  const formatLevel = (level: string): string => t(`levels.${level}`);

  const knownOptions = knownLanguages.map((lang) => ({ value: lang, label: formatLanguage(lang) }));
  const learningOptions = learningLanguages.map((lang) => ({ value: lang, label: formatLanguage(lang) }));
  const levelOptions = availableLevels.map(({ level, wordCount }) => ({
    value: level,
    label: formatLevel(level),
    sublabel: `${wordCount} ${t('quiz.words')}`,
  }));

  const canStart = selectedList !== null && selectedList !== undefined;
  const canSpeak = selectedLearning !== undefined;

  return (
    <main className="home-page">
      <div className="home-container">
        <FeedCard
          title={null}
          headerAction={
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} title={t('settings.title')}>
              <Settings size={20} />
            </Button>
          }
        >
          <div className="selector-container">
            {loading ? (
              <div className="loading-state">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-row">
                    <div className="skeleton-shimmer skeleton-label" />
                    <div className="skeleton-shimmer skeleton-select" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="selector-grid">
                <div className="selector-row">
                  <div className="selector-label">
                    <Languages size={18} className="label-icon" />
                    <span>{t('quiz.iSpeak')}</span>
                  </div>
                  <Select
                    value={selectedKnown}
                    onValueChange={handleKnownChange}
                    options={knownOptions}
                    placeholder={t('quiz.selectLanguage')}
                    className="selector-trigger"
                  />
                </div>

                <div className={`selector-row ${selectedKnown === undefined ? 'disabled' : ''}`}>
                  <div className="selector-label">
                    <BookOpen size={18} className="label-icon" />
                    <span>{t('quiz.iLearn')}</span>
                  </div>
                  <Select
                    value={selectedLearning}
                    onValueChange={handleLearningChange}
                    options={learningOptions}
                    placeholder={t('quiz.selectLanguage')}
                    disabled={selectedKnown === undefined}
                    className="selector-trigger"
                  />
                </div>

                <div className={`selector-row ${selectedLearning === undefined ? 'disabled' : ''}`}>
                  <div className="selector-label">
                    <GraduationCap size={18} className="label-icon" />
                    <span>{t('quiz.level')}</span>
                  </div>
                  <Select
                    value={selectedLevel}
                    onValueChange={setSelectedLevel}
                    options={levelOptions}
                    placeholder={t('quiz.selectLevel')}
                    disabled={selectedLearning === undefined}
                    className="selector-trigger"
                  />
                </div>
              </div>
            )}

            {loadError !== null && <div className="error-message">{loadError}</div>}

            <div className="action-buttons">
              <Button
                size="lg"
                className="action-button"
                onClick={() => {
                  void handleLearnWords();
                }}
                disabled={!canStart}
              >
                <Play size={20} />
                <span>{t('home.learnWords', 'Learn Words')}</span>
              </Button>

              <Button
                size="lg"
                variant="secondary"
                className="action-button"
                onClick={handlePracticePronunciation}
                disabled={!canSpeak}
              >
                <Mic size={20} />
                <span>{t('home.practicePronunciation', 'Practice Pronunciation')}</span>
              </Button>
            </div>
          </div>
        </FeedCard>
      </div>

      <style>{`
        .home-page {
          max-width: 600px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }

        .home-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .selector-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .selector-grid {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .selector-row {
          display: grid;
          grid-template-columns: 120px 1fr;
          align-items: center;
          gap: var(--spacing-md);
          transition: opacity var(--transition-speed) ease;
        }

        @media (width <= 480px) {
          .selector-row {
            grid-template-columns: 1fr;
            gap: var(--spacing-xs);
          }
        }

        .selector-row.disabled {
          opacity: 0.5;
        }

        .selector-label {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-weight: var(--font-weight-medium);
          color: var(--color-text);
          white-space: nowrap;
        }

        .selector-label .label-icon {
          color: var(--color-primary);
          flex-shrink: 0;
        }

        .selector-trigger {
          width: 100%;
          min-height: var(--touch-target-min);
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          padding-top: var(--spacing-md);
        }

        .action-button {
          width: 100%;
          justify-content: center;
          gap: var(--spacing-sm);
        }

        .error-message {
          color: var(--color-destructive);
          text-align: center;
          padding: var(--spacing-sm);
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .skeleton-row {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: var(--spacing-md);
          align-items: center;
        }

        @media (width <= 480px) {
          .skeleton-row {
            grid-template-columns: 1fr;
            gap: var(--spacing-xs);
          }
        }

        .skeleton-label {
          height: 20px;
          border-radius: var(--radius-sm);
        }

        .skeleton-select {
          height: var(--touch-target-min);
          border-radius: var(--radius-md);
        }

        .skeleton-shimmer {
          background: linear-gradient(90deg, var(--color-muted) 25%, var(--color-muted-foreground) 50%, var(--color-muted) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </main>
  );
}
