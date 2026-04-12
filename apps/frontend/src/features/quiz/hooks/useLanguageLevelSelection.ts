import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { WordList } from '@api/types';
import { safeStorage } from '@shared/utils';
import { parseListName, type ParsedList } from '../utils';

const SELECTION_KEY = 'lingua-quiz-course-selection';

interface SavedSelection {
  known?: string;
  learning?: string;
  level?: string;
}

function loadSaved(): SavedSelection {
  try {
    const raw = safeStorage.getItem(SELECTION_KEY);
    if (raw === null) return {};
    return JSON.parse(raw) as SavedSelection;
  } catch {
    return {};
  }
}

function persistSelection(known?: string, learning?: string, level?: string): void {
  try {
    safeStorage.setItem(SELECTION_KEY, JSON.stringify({ known, learning, level }));
  } catch {
    /* ignore */
  }
}

interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export function useLanguageLevelSelection(wordLists: WordList[]) {
  const { t } = useTranslation();

  const saved = useMemo(() => loadSaved(), []);
  const [selectedKnown, setSelectedKnown] = useState<string | undefined>(saved.known);
  const [selectedLearning, setSelectedLearning] = useState<string | undefined>(saved.learning);
  const [selectedLevel, setSelectedLevel] = useState<string | undefined>(saved.level);

  const parsedLists = useMemo(
    () => wordLists.map(parseListName).filter((p): p is ParsedList => p !== null),
    [wordLists],
  );

  const knownLanguages = useMemo(
    () => [...new Set(parsedLists.map((p) => p.target))].sort((a, b) => a.localeCompare(b)),
    [parsedLists],
  );

  const learningLanguages = useMemo(() => {
    if (selectedKnown === undefined) return [];
    return [...new Set(parsedLists.filter((p) => p.target === selectedKnown).map((p) => p.source))].sort((a, b) =>
      a.localeCompare(b),
    );
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
    return (
      parsedLists.find(
        (p) => p.target === selectedKnown && p.source === selectedLearning && p.level === selectedLevel,
      ) ?? null
    );
  }, [parsedLists, selectedKnown, selectedLearning, selectedLevel]);

  const handleKnownChange = (value: string) => {
    setSelectedKnown(value);
    const learningExists = parsedLists.some((p) => p.target === value && p.source === selectedLearning);
    const newLearning = learningExists ? selectedLearning : undefined;
    const levelExists =
      newLearning !== undefined &&
      parsedLists.some((p) => p.target === value && p.source === newLearning && p.level === selectedLevel);
    const newLevel = levelExists ? selectedLevel : undefined;
    setSelectedLearning(newLearning);
    setSelectedLevel(newLevel);
    persistSelection(value, newLearning, newLevel);
  };

  const handleLearningChange = (value: string) => {
    setSelectedLearning(value);
    const levelExists = parsedLists.some(
      (p) => p.target === selectedKnown && p.source === value && p.level === selectedLevel,
    );
    const newLevel = levelExists ? selectedLevel : undefined;
    setSelectedLevel(newLevel);
    persistSelection(selectedKnown, value, newLevel);
  };

  const handleLevelChange = (value: string) => {
    setSelectedLevel(value);
    persistSelection(selectedKnown, selectedLearning, value);
  };

  const formatLanguage = (code: string): string => t(`languages.${code}`);
  const formatLevel = (level: string): string => t(`levels.${level}`);

  const knownOptions: SelectOption[] = knownLanguages.map((lang) => ({ value: lang, label: formatLanguage(lang) }));
  const learningOptions: SelectOption[] = learningLanguages.map((lang) => ({
    value: lang,
    label: formatLanguage(lang),
  }));
  const levelOptions: SelectOption[] = availableLevels.map(({ level, wordCount }) => ({
    value: level,
    label: formatLevel(level),
    sublabel: `${wordCount} ${t('quiz.words')}`,
  }));

  return {
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
    canStart: selectedList !== null,
  };
}
