interface UsageExamplesProps {
  examples?: { source: string; target: string } | null;
}

export function UsageExamples({ examples = null }: UsageExamplesProps): React.JSX.Element | null {
  if (examples === null) return null;

  return (
    <div className="flex flex-col gap-2">
      {examples.source !== '' && <p className="example-text">{examples.source}</p>}
      {examples.target !== '' && <p className="example-text">{examples.target}</p>}
    </div>
  );
}
