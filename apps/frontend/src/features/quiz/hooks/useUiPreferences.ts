import { useState, useCallback, useEffect } from 'react';
import { safeStorage, STORAGE_KEYS } from '@shared/utils';

interface FoldedLists {
  [levelId: string]: boolean;
}

interface UiPreferences {
  foldedLists: FoldedLists;
  toggleFold: (levelId: string) => void;
}

const loadFoldedLists = (): FoldedLists => {
  const stored = safeStorage.getItem(STORAGE_KEYS.FOLDED_LISTS);
  if (stored !== null) {
    try {
      return JSON.parse(stored) as FoldedLists;
    } catch {
      return {};
    }
  }
  return {};
};

export function useUiPreferences(): UiPreferences {
  const [foldedLists, setFoldedLists] = useState<FoldedLists>(loadFoldedLists);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.FOLDED_LISTS, JSON.stringify(foldedLists));
  }, [foldedLists]);

  const toggleFold = useCallback((levelId: string) => {
    setFoldedLists((prev) => ({
      ...prev,
      [levelId]: prev[levelId] === false,
    }));
  }, []);

  return {
    foldedLists,
    toggleFold,
  };
}
