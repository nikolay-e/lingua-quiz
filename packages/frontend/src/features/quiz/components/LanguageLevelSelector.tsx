import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, GraduationCap, BookOpen, Play } from 'lucide-react';
import type { WordList } from '@api/types';
import { Button, Select } from '@shared/ui';

interface ParsedList {
  source: string;
  target: string;
  level: string;
  listName: string;
  wordCount: number;
}

interface LanguageLevelSelectorProps {
  wordLists: WordList[];
  loading?: boolean;
  onSelect: (listName: string) => void;
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
      <div className="selector-container">
        <div className="loading-state">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-row">
              <div className="skeleton-shimmer skeleton-label" />
              <div className="skeleton-shimmer skeleton-select" />
            </div>
          ))}
        </div>
        <style>{selectorStyles}</style>
      </div>
    );
  }

  return (
    <div className="selector-container">
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

      {selectedList !== null && selectedList !== undefined && (
        <div className="start-section">
          <Button size="default" className="start-button" onClick={handleStart}>
            <Play size={18} />
            <span>{t('quiz.startLearning')}</span>
          </Button>
        </div>
      )}

      <style>{selectorStyles}</style>
    </div>
  );
}

const selectorStyles = `
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

  .start-section {
    display: flex;
    justify-content: center;
    padding-top: var(--spacing-sm);
  }

  .start-button {
    min-width: 180px;
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
`;
