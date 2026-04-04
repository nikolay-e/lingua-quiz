import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Mic, Flame, Target, Download } from 'lucide-react';
import { Button } from '@shared/ui';
import { AppShell, ModeCard, useToast } from '@shared/components';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { useQuizStore } from '@features/quiz/stores/quiz.store';
import { useLanguageLevelSelection } from '@features/quiz/hooks';
import { useSpeakStore } from '@features/speak';
import { extractErrorMessage } from '@shared/utils';
import api from '@api/api';
import { generateVocabularyPdf } from '@features/quiz/services/pdf-service';

export function HomePage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const token = useAuthStore((state) => state.token);
  const wordLists = useQuizStore((state) => state.wordLists);
  const loadWordLists = useQuizStore((state) => state.loadWordLists);
  const streakDays = useSpeakStore((state) => state.streakDays);
  const attempts = useSpeakStore((state) => state.attempts);

  const { selectedList } = useLanguageLevelSelection(wordLists);

  const speakAccuracy = useMemo(() => {
    if (attempts.length === 0) return null;
    const passed = attempts.filter((a) => a.passed).length;
    return Math.round((passed / attempts.length) * 100);
  }, [attempts]);

  const hasStats = streakDays > 0 || attempts.length > 0;

  const handleLoadWordLists = useCallback(async (): Promise<void> => {
    if (token === null) return;
    try {
      await loadWordLists(token);
    } catch {
      /* word lists will load on quiz page */
    }
  }, [token, loadWordLists]);

  useEffect(() => {
    void handleLoadWordLists();
  }, [handleLoadWordLists]);

  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = async (includeExamples: boolean) => {
    if (selectedList === null || token === null) return;
    setPdfLoading(true);
    try {
      const translations = await api.fetchTranslations(token, selectedList.listName);
      await generateVocabularyPdf(translations, selectedList.listName, includeExamples);
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, t('common.error')));
    } finally {
      setPdfLoading(false);
    }
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

      <ModeCard
        icon={BookOpen}
        title={t('home.learnWords')}
        description={t('home.learnWordsDesc')}
        disabled={false}
        variant="primary"
        onClick={() => {
          void navigate('/quiz');
        }}
        badge={selectedList?.listName}
      />

      {selectedList !== null && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={pdfLoading}
            onClick={() => {
              void handleDownloadPdf(false);
            }}
          >
            <Download size={16} />
            {pdfLoading ? t('home.pdfGenerating') : t('home.downloadPdf')}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={pdfLoading}
            onClick={() => {
              void handleDownloadPdf(true);
            }}
          >
            <Download size={16} />
            {pdfLoading ? t('home.pdfGenerating') : t('home.downloadPdfExamples')}
          </Button>
        </div>
      )}
    </AppShell>
  );
}
