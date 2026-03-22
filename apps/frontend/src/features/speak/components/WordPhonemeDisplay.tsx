import { useState, useEffect } from 'react';
import { ChevronDown, AlertTriangle, MinusCircle, PlusCircle } from 'lucide-react';
import type { WordAssessment, ErrorType } from '../types';
import { scoreToColor } from '../lib/colors';
import { cn } from '@shared/utils';

interface WordPhonemeDisplayProps {
  wordAssessments: WordAssessment[];
  threshold: number;
}

const ERROR_TYPE_CONFIG: Record<string, { icon: typeof AlertTriangle; label: string; className: string }> = {
  Mispronunciation: {
    icon: AlertTriangle,
    label: 'Mispronounced',
    className: 'text-error bg-error/10',
  },
  Omission: {
    icon: MinusCircle,
    label: 'Omitted',
    className: 'text-warning bg-warning/10',
  },
  Insertion: {
    icon: PlusCircle,
    label: 'Extra',
    className: 'text-muted-foreground bg-muted/30',
  },
};

function ErrorTypeBadge({ errorType }: { errorType: ErrorType }) {
  if (errorType === 'None') return null;

  const cfg = ERROR_TYPE_CONFIG[errorType];
  if (cfg === undefined) return null;
  const Icon = cfg.icon;

  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium', cfg.className)}>
      <Icon size={10} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

function PhonemeChip({
  phoneme,
  score,
  expected,
  actual,
}: {
  phoneme: string;
  score: number;
  expected: string;
  actual?: string;
}) {
  const color = scoreToColor(score);
  const hasError = actual !== undefined && actual !== '' && actual !== expected;
  const roundedScore = Math.round(score);

  return (
    <div
      className="flex flex-col items-center gap-0.5"
      title={hasError ? `Expected: /${expected}/ Got: /${actual}/` : `/${phoneme}/ ${roundedScore}%`}
    >
      <span className="text-base font-mono font-semibold leading-none" style={{ color }}>
        {phoneme}
      </span>
      <span className="text-[10px] font-medium leading-none tabular-nums" style={{ color }}>
        {roundedScore}
      </span>
      {hasError && <span className="text-[9px] text-error leading-none font-mono">/{actual}/</span>}
    </div>
  );
}

function WordCard({
  assessment,
  isExpanded,
  onToggle,
}: {
  assessment: WordAssessment;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const color = scoreToColor(assessment.accuracyScore);
  const roundedScore = Math.round(assessment.accuracyScore);
  const hasPhonemes = assessment.phonemes.length > 0;

  const Tag = hasPhonemes ? 'button' : 'span';

  return (
    <div className="flex flex-col">
      <Tag
        {...(hasPhonemes ? { type: 'button' as const, onClick: onToggle } : {})}
        className={cn(
          'group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-150',
          'border',
          isExpanded ? 'bg-card border-border shadow-sm' : 'bg-card/50 border-transparent hover:border-border/50',
          hasPhonemes && 'cursor-pointer',
        )}
        aria-expanded={hasPhonemes ? isExpanded : undefined}
        aria-label={hasPhonemes ? `${assessment.word}, score ${roundedScore}%` : undefined}
      >
        <span className="text-sm font-semibold" style={{ color }}>
          {assessment.word}
        </span>
        <span className="text-xs font-medium tabular-nums opacity-80" style={{ color }}>
          {roundedScore}%
        </span>
        {assessment.errorType !== 'None' && <ErrorTypeBadge errorType={assessment.errorType} />}
        {hasPhonemes && (
          <ChevronDown
            size={14}
            className={cn('text-muted-foreground transition-transform duration-150 ml-0.5', isExpanded && 'rotate-180')}
            aria-hidden="true"
          />
        )}
      </Tag>

      {isExpanded && hasPhonemes && (
        <div className="mt-1 px-2 py-2 bg-surface/50 rounded-lg border border-border/50 animate-fade-in">
          <div className="flex items-end gap-2.5 justify-center flex-wrap">
            {assessment.phonemes.map((p, i) => (
              <PhonemeChip
                key={`${p.phoneme}-${i}`}
                phoneme={p.phoneme}
                score={p.score}
                expected={p.expected}
                actual={p.actual}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function WordPhonemeDisplay({ wordAssessments, threshold }: WordPhonemeDisplayProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    setExpandedIndex(null);
  }, [wordAssessments]);

  if (wordAssessments.length === 0) return null;

  const hasExpandableProblems = wordAssessments.some(
    (wa) => (wa.accuracyScore < threshold || wa.errorType !== 'None') && wa.phonemes.length > 0,
  );

  const handleToggle = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="flex flex-col gap-3 mt-3">
      <div className="flex flex-wrap gap-1.5 justify-center">
        {wordAssessments.map((wa, i) => (
          <WordCard
            key={`${wa.word}-${i}`}
            assessment={wa}
            isExpanded={expandedIndex === i}
            onToggle={() => handleToggle(i)}
          />
        ))}
      </div>

      {hasExpandableProblems && expandedIndex === null && (
        <p className="text-xs text-muted-foreground text-center">Tap a word to see phoneme details</p>
      )}
    </div>
  );
}
