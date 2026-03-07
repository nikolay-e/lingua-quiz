import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Languages, GraduationCap, BookOpen, Mic, Flame, Target, ChevronDown } from 'lucide-react';
import { Select, Skeleton } from '@shared/ui';
import { AppShell, ErrorDisplay, ModeCard, useToast } from '@shared/components';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { useQuizStore } from '@features/quiz/stores/quiz.store';
import { useLanguageLevelSelection } from '@features/quiz/hooks';
import { useSpeakStore, SUPPORTED_SPEAK_LANGS } from '@features/speak';
import { logger, extractErrorMessage, cn } from '@shared/utils';

export function HomePage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const token = useAuthStore((state) => state.token);
  const wordLists = useQuizStore((state) => state.wordLists);
  const loading = useQuizStore((state) => state.loading);
  const loadWordLists = useQuizStore((state) => state.loadWordLists);
  const startQuiz = useQuizStore((state) => state.startQuiz);
  const reset = useQuizStore((state) => state.reset);
  const setSpeakLanguage = useSpeakStore((state) => state.setLanguage);
  const streakDays = useSpeakStore((state) => state.streakDays);
  const attempts = useSpeakStore((state) => state.attempts);

  const {
    selectedKnown,
    selectedLearning,
    selectedLevel,
    selectedList,
    knownOptions,
    learningOptions,
    levelOptions,
    handleKnownChange,
    handleLearningChange,
    handleLevelChange,
    canStart,
    canSpeak,
  } = useLanguageLevelSelection(wordLists);

  const [loadError, setLoadError] = useState<string | null>(null);

  const speakAccuracy = useMemo(() => {
    if (attempts.length === 0) return null;
    const passed = attempts.filter((a) => a.passed).length;
    return Math.round((passed / attempts.length) * 100);
  }, [attempts]);

  const hasStats = streakDays > 0 || attempts.length > 0;

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
    if (selectedList === null || token === null) return;
    reset();
    try {
      await startQuiz(token, selectedList.listName);
      void navigate('/quiz');
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, t('common.error')));
    }
  };

  const handlePracticePronunciation = () => {
    if (selectedLearning === undefined) return;
    const speakLang = SUPPORTED_SPEAK_LANGS[selectedLearning];
    if (speakLang === undefined) return;
    setSpeakLanguage(speakLang);
    void navigate('/speak');
  };

  return (
    <AppShell maxWidth="2xl">
      {hasStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {streakDays > 0 && (
            <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-4">
              <Flame size={24} className="text-secondary shrink-0" />
              <div>
                <p className="text-2xl font-bold text-foreground">{streakDays}</p>
                <p className="text-xs text-muted-foreground">{t('home.streakDays')}</p>
              </div>
            </div>
          )}
          {speakAccuracy !== null && (
            <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-4">
              <Target size={24} className="text-primary shrink-0" />
              <div>
                <p className="text-2xl font-bold text-foreground">{speakAccuracy}%</p>
                <p className="text-xs text-muted-foreground">{t('home.accuracy')}</p>
              </div>
            </div>
          )}
          {attempts.length > 0 && (
            <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-4">
              <Mic size={24} className="text-muted-foreground shrink-0" />
              <div>
                <p className="text-2xl font-bold text-foreground">{attempts.length}</p>
                <p className="text-xs text-muted-foreground">{t('home.attempts')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModeCard
          icon={BookOpen}
          title={t('home.learnWords')}
          description={t('home.learnWordsDesc')}
          disabled={!canStart}
          variant="primary"
          onClick={() => {
            void handleLearnWords();
          }}
          badge={selectedList?.listName}
        />
        <ModeCard
          icon={Mic}
          title={t('home.practicePronunciation')}
          description={t('home.practicePronunciationDesc')}
          disabled={!canSpeak}
          variant="secondary"
          onClick={handlePracticePronunciation}
        />
      </div>

      <details open>
        <summary className="cursor-pointer select-none flex items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors list-none [&::-webkit-details-marker]:hidden">
          <ChevronDown
            size={16}
            className="transition-transform [[open]>&]:rotate-0 [details:not([open])>&]:-rotate-90"
          />
          {t('home.chooseCourse')}
          {selectedList !== null && (
            <span className="text-xs text-primary font-normal ml-1">{selectedList.listName}</span>
          )}
        </summary>
        <div className="mt-3 bg-card border border-border rounded-lg p-5">
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
                  onValueChange={handleLevelChange}
                  options={levelOptions}
                  placeholder={t('quiz.selectLevel')}
                  disabled={selectedLearning === undefined}
                />
              </div>
            </div>
          )}

          {loadError !== null && (
            <ErrorDisplay
              message={loadError}
              onRetry={() => {
                void handleLoadWordLists();
              }}
              retryLabel={t('common.tryAgain')}
            />
          )}
        </div>
      </details>
    </AppShell>
  );
}
