interface UsageExamplesProps {
  examples?: { source: string; target: string } | null;
}

export function UsageExamples({ examples = null }: UsageExamplesProps): React.JSX.Element | null {
  if (examples === null) return null;

  return (
    <div className="flex flex-col gap-2">
      {examples.source !== '' && <p className="m-0 text-sm italic bg-muted p-2 rounded">{examples.source}</p>}
      {examples.target !== '' && <p className="m-0 text-sm italic bg-muted p-2 rounded">{examples.target}</p>}
    </div>
  );
}
