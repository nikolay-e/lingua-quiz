import { useEffect, useRef, useCallback } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@shared/utils';

interface LevelChangeAnimationProps {
  isVisible?: boolean;
  isLevelUp?: boolean;
  fromLevel?: string;
  toLevel?: string;
  onComplete?: () => void;
}

const levelLabel = (level: string | undefined) => level?.replace('LEVEL_', 'Level ') ?? '';

export function LevelChangeAnimation({
  isVisible = false,
  isLevelUp = true,
  fromLevel,
  toLevel,
  onComplete,
}: LevelChangeAnimationProps): React.JSX.Element | null {
  const animationRef = useRef<HTMLDivElement>(null);

  const triggerAnimation = useCallback(() => {
    const element = animationRef.current;
    if (element === null) return;

    element.style.animation = 'none';
    void element.offsetHeight;
    element.style.animation = '';

    const timer = setTimeout(() => {
      onComplete?.();
    }, 1200);

    return () => {
      clearTimeout(timer);
    };
  }, [onComplete]);

  useEffect(() => {
    if (!isVisible) return;
    return triggerAnimation();
  }, [isVisible, triggerAnimation]);

  if (!isVisible) return null;

  return (
    <div
      ref={animationRef}
      className={cn(
        'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none',
        isLevelUp ? 'animate-level-up' : 'animate-level-down',
      )}
      role="alert"
      aria-live="polite"
    >
      <div
        className={cn(
          'flex items-center gap-3 px-6 py-4 rounded-lg border-2 bg-card/95 backdrop-blur-sm shadow-lg',
          isLevelUp ? 'border-success text-success' : 'border-destructive text-destructive',
        )}
      >
        <span className="text-2xl">{isLevelUp ? <ArrowUp size={24} /> : <ArrowDown size={24} />}</span>
        <div className="flex flex-col">
          <span className="font-bold text-lg">{isLevelUp ? 'Level Up!' : 'Level Down'}</span>
          {fromLevel !== undefined && toLevel !== undefined && (
            <span className="text-sm opacity-80">
              {levelLabel(fromLevel)} → {levelLabel(toLevel)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
