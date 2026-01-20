import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, GraduationCap, BookOpen, Play } from 'lucide-react';
import type { WordList } from '@api/types';
import { Button, Select, Skeleton } from '@shared/ui';
import { cn } from '@shared/utils';
import { parseListName, type ParsedList } from '../utils';

interface LanguageLevelSelectorProps {
  wordLists: WordList[];
  loading?: boolean;
  onSelect: (listName: string) => void;
}

export function LanguageLevelSelector({
  wordLists,
  loading = false,
  onSelect,
}: LanguageLevelSelectorProps): React.JSX.Element {
  const { t } = useTranslation();

  const [selectedKnown, setSelectedKnown] = useState<string | undefined>(undefined);
  const [selectedLearning, setSelectedLearning] = useState<string | undefined>(undefined);
  const [selectedLevel, setSelectedLevel] = useState<string | undefined>(undefined);

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

  const handleStart = () => {
    if (selectedList !== null && selectedList !== undefined) {
      onSelect(selectedList.listName);
    }
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

      {selectedList !== null && selectedList !== undefined && (
        <div className="pt-4">
          <Button size="default" className="w-full" onClick={handleStart}>
            <Play size={18} />
            <span>{t('quiz.startLearning')}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
