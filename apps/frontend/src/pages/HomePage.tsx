import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Languages, GraduationCap, BookOpen, Play, Mic, Settings } from 'lucide-react';
import { Button, Select, Skeleton } from '@shared/ui';
import { FeedCard } from '@shared/components';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { useQuizStore } from '@features/quiz/stores/quiz.store';
import { useSpeakStore } from '@features/speak';
import { parseListName, type ParsedList } from '@features/quiz/utils';
import { logger, extractErrorMessage, cn } from '@shared/utils';

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
      void navigate('/quiz');
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
    void navigate('/speak');
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
    <main
      id="main-content"
      className="w-full max-w-210 mx-auto flex flex-col gap-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] md:pt-16 md:pb-12 md:px-6 md:gap-6"
    >
      <FeedCard dense title={null}>
        <header className="flex items-center justify-between">
          <h1 className="m-0 text-primary text-xl flex items-center gap-2">
            <Languages size={28} /> LinguaQuiz
          </h1>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} aria-label={t('settings.title')}>
            <Settings size={20} aria-hidden="true" />
          </Button>
        </header>
      </FeedCard>

      <FeedCard title={null}>
        <div className="flex flex-col gap-6">
          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-[120px_1fr] gap-4 items-center">
                  <Skeleton className="h-5" />
                  <Skeleton className="h-10" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                <div className="flex items-center gap-2 font-medium text-foreground whitespace-nowrap">
                  <Languages size={18} className="text-muted-foreground" />
                  <span>{t('quiz.iSpeak')}</span>
                </div>
                <Select
                  value={selectedKnown}
                  onValueChange={handleKnownChange}
                  options={knownOptions}
                  placeholder={t('quiz.selectLanguage')}
                />
              </div>

              <div
                className={cn(
                  'grid grid-cols-[120px_1fr] gap-4 items-center transition-opacity',
                  selectedKnown === undefined && 'opacity-50 pointer-events-none',
                )}
              >
                <div className="flex items-center gap-2 font-medium text-foreground whitespace-nowrap">
                  <BookOpen size={18} className="text-muted-foreground" />
                  <span>{t('quiz.iLearn')}</span>
                </div>
                <Select
                  value={selectedLearning}
                  onValueChange={handleLearningChange}
                  options={learningOptions}
                  placeholder={t('quiz.selectLanguage')}
                  disabled={selectedKnown === undefined}
                />
              </div>

              <div
                className={cn(
                  'grid grid-cols-[120px_1fr] gap-4 items-center transition-opacity',
                  selectedLearning === undefined && 'opacity-50 pointer-events-none',
                )}
              >
                <div className="flex items-center gap-2 font-medium text-foreground whitespace-nowrap">
                  <GraduationCap size={18} className="text-muted-foreground" />
                  <span>{t('quiz.level')}</span>
                </div>
                <Select
                  value={selectedLevel}
                  onValueChange={setSelectedLevel}
                  options={levelOptions}
                  placeholder={t('quiz.selectLevel')}
                  disabled={selectedLearning === undefined}
                />
              </div>
            </div>
          )}

          {loadError !== null && <div className="text-destructive text-center p-3">{loadError}</div>}

          <div className="flex flex-col gap-4 pt-4">
            <Button
              size="lg"
              className="w-full justify-center gap-3"
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
              className="w-full justify-center gap-3"
              onClick={handlePracticePronunciation}
              disabled={!canSpeak}
            >
              <Mic size={20} />
              <span>{t('home.practicePronunciation', 'Practice Pronunciation')}</span>
            </Button>
          </div>
        </div>
      </FeedCard>
    </main>
  );
}
