import { useTranslation } from 'react-i18next';
import { Languages, GraduationCap, BookOpen, Play, Download } from 'lucide-react';
import type { WordList } from '@api/types';
import { Button, Select, Skeleton } from '@shared/ui';
import { cn } from '@shared/utils';
import { useLanguageLevelSelection } from '../hooks';

interface LanguageLevelSelectorProps {
  wordLists: WordList[];
  loading?: boolean;
  onSelect: (listName: string) => void;
  onDownloadPdf?: (listName: string, includeExamples: boolean) => void;
  pdfLoading?: boolean;
}

export function LanguageLevelSelector({
  wordLists,
  loading = false,
  onSelect,
  onDownloadPdf,
  pdfLoading = false,
}: Readonly<LanguageLevelSelectorProps>): React.JSX.Element {
  const { t } = useTranslation();

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
  } = useLanguageLevelSelection(wordLists);

  const handleStart = () => {
    if (selectedList !== null) {
      onSelect(selectedList.listName);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-[120px_1fr] gap-4 items-center">
              <Skeleton className="h-5" />
              <Skeleton className="h-11" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
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
            aria-label={t('quiz.iSpeak')}
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
            aria-label={t('quiz.iLearn')}
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
            aria-label={t('quiz.level')}
          />
        </div>
      </div>

      {canStart && (
        <div className="flex flex-col gap-2 pt-4">
          <Button size="default" className="w-full" onClick={handleStart}>
            <Play size={18} />
            <span>{t('quiz.startLearning')}</span>
          </Button>
          {onDownloadPdf !== undefined && selectedList !== null && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={pdfLoading}
              onClick={() => onDownloadPdf(selectedList.listName, true)}
            >
              <Download size={14} />
              {pdfLoading ? t('home.pdfGenerating') : t('home.downloadPdf')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
