import type { PronunciationScores } from '../types';
import { scoreToColor } from '../lib/colors';

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
    <div className="score-ring">
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
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
          style={{ transition: 'all 0.5s' }}
        />
      </svg>
      <span className="score-value" style={{ color }}>
        {Math.round(value)}
      </span>
      <span className="score-label">{label}</span>
    </div>
  );
}

function ScoreRow({ value, label }: { value: number; label: string }): React.JSX.Element {
  const color = scoreToColor(value);
  return (
    <div className="score-row">
      <span className="score-row-label">{label}</span>
      <span className="score-row-value" style={{ color }}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

export function ScoreCard({ scores, threshold, passed: passedProp }: ScoreCardProps): React.JSX.Element {
  if (!scores) {
    return (
      <div className="score-card score-card-empty">
        <p>Record speech to get assessment</p>
      </div>
    );
  }

  const passed = passedProp ?? scores.pronunciation >= threshold;

  return (
    <div className="score-card">
      <div className="score-card-header">
        <h3>Score</h3>
        <span className={`score-badge ${passed ? 'passed' : 'failed'}`}>
          {passed ? 'Passed!' : `Need ${threshold}%`}
        </span>
      </div>

      <div className="score-card-main">
        <MainScoreRing value={scores.pronunciation} label="Overall" />
      </div>

      <div className="score-card-details">
        <ScoreRow value={scores.accuracy} label="Accuracy" />
        <ScoreRow value={scores.fluency} label="Fluency" />
        <ScoreRow value={scores.prosody} label="Prosody" />
        <ScoreRow value={scores.completeness} label="Completeness" />
      </div>
    </div>
  );
}
