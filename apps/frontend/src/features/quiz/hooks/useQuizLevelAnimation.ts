import { useState, useCallback } from 'react';

export interface LevelChange {
  from: string;
  to: string;
}

export interface QuizLevelAnimationReturn {
  showLevelAnimation: boolean;
  isLevelUp: boolean;
  levelChangeFrom: string | undefined;
  levelChangeTo: string | undefined;
  triggerLevelAnimation: (change: LevelChange) => void;
  handleLevelAnimationComplete: () => void;
}

export function useQuizLevelAnimation(): QuizLevelAnimationReturn {
  const [showLevelAnimation, setShowLevelAnimation] = useState(false);
  const [isLevelUp, setIsLevelUp] = useState(true);
  const [levelChangeFrom, setLevelChangeFrom] = useState<string | undefined>(undefined);
  const [levelChangeTo, setLevelChangeTo] = useState<string | undefined>(undefined);

  const triggerLevelAnimation = useCallback((change: LevelChange) => {
    const fromNum = parseInt(change.from.replace('LEVEL_', ''));
    const toNum = parseInt(change.to.replace('LEVEL_', ''));
    setIsLevelUp(toNum > fromNum);
    setLevelChangeFrom(change.from);
    setLevelChangeTo(change.to);
    setShowLevelAnimation(true);
  }, []);

  const handleLevelAnimationComplete = useCallback(() => {
    setShowLevelAnimation(false);
  }, []);

  return {
    showLevelAnimation,
    isLevelUp,
    levelChangeFrom,
    levelChangeTo,
    triggerLevelAnimation,
    handleLevelAnimationComplete,
  };
}
