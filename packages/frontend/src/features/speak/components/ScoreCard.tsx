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

      <style>{`
        .score-card {
          background: var(--color-card);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
        }

        .score-card-empty {
          text-align: center;
          color: var(--color-muted-foreground);
          font-size: var(--font-size-sm);
        }

        .score-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-sm);
        }

        .score-card-header h3 {
          font-weight: var(--font-weight-semibold);
          margin: 0;
        }

        .score-badge {
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-medium);
        }

        .score-badge.passed {
          background: color-mix(in srgb, var(--color-success) 20%, transparent);
          color: var(--color-success);
        }

        .score-badge.failed {
          background: color-mix(in srgb, var(--color-error) 20%, transparent);
          color: var(--color-error);
        }

        .score-card-main {
          display: flex;
          justify-content: center;
          margin-bottom: var(--spacing-md);
        }

        .score-ring {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .score-value {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-bold);
        }

        .score-label {
          margin-top: var(--spacing-xs);
          font-size: var(--font-size-xs);
          color: var(--color-muted-foreground);
        }

        .score-card-details {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .score-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .score-row-label {
          font-size: var(--font-size-sm);
          color: var(--color-muted-foreground);
        }

        .score-row-value {
          font-weight: var(--font-weight-semibold);
        }
      `}</style>
    </div>
  );
}
