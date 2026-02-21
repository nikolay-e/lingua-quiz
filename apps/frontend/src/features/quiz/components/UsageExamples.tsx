interface UsageExamplesProps {
  examples?: { source: string; target: string } | null;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export function UsageExamples({
  examples = null,
  sourceLanguage,
  targetLanguage,
}: UsageExamplesProps): React.JSX.Element | null {
  if (examples === null) return null;

  return (
    <div className="flex flex-col gap-2">
      {examples.source !== '' && (
        <p className="m-0 text-sm italic bg-muted p-2 rounded flex items-baseline gap-2" lang={sourceLanguage}>
          {sourceLanguage !== undefined && (
            <span className="text-xs font-medium text-muted-foreground uppercase not-italic shrink-0">
              {sourceLanguage}
            </span>
          )}
          <span>{examples.source}</span>
        </p>
      )}
      {examples.target !== '' && (
        <p className="m-0 text-sm italic bg-muted p-2 rounded flex items-baseline gap-2" lang={targetLanguage}>
          {targetLanguage !== undefined && (
            <span className="text-xs font-medium text-muted-foreground uppercase not-italic shrink-0">
              {targetLanguage}
            </span>
          )}
          <span>{examples.target}</span>
        </p>
      )}
    </div>
  );
}
