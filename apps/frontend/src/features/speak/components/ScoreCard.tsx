import type { PronunciationScores } from '../types';
import { scoreToColor } from '../lib/colors';
import { cn } from '@shared/utils';

interface ScoreCardProps {
  scores: PronunciationScores | null;
  threshold: number;
  passed?: boolean;
}

function MainScoreRing({ value, label }: { value: number; label: string }): React.JSX.Element {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const color = scoreToColor(value);

  return (
    <div className="flex flex-col items-center relative">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-border)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold"
        style={{ color }}
      >
        {Math.round(value)}
      </span>
      <span className="mt-2 text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function ScoreRow({ value, label }: { value: number; label: string }): React.JSX.Element {
  const color = scoreToColor(value);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold" style={{ color }}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

export function ScoreCard({ scores, threshold, passed: passedProp }: ScoreCardProps): React.JSX.Element {
  if (scores === null) {
    return (
      <div className="bg-card rounded-lg p-4 text-center text-sm text-muted-foreground">
        <p>Record speech to get assessment</p>
      </div>
    );
  }

  const passed = passedProp ?? scores.pronunciation >= threshold;

  return (
    <div className="bg-card rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-base font-semibold">Score</h3>
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            passed ? 'bg-success/20 text-success' : 'bg-error/20 text-error',
          )}
        >
          {passed ? 'Passed!' : `Need ${threshold}%`}
        </span>
      </div>

      <div className="flex justify-center mb-4">
        <MainScoreRing value={scores.pronunciation} label="Overall" />
      </div>

      <div className="flex flex-col gap-2">
        <ScoreRow value={scores.accuracy} label="Accuracy" />
        <ScoreRow value={scores.fluency} label="Fluency" />
        <ScoreRow value={scores.prosody} label="Prosody" />
        <ScoreRow value={scores.completeness} label="Completeness" />
      </div>
    </div>
  );
}
