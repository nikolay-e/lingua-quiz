import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@shared/ui';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
}

export function ErrorDisplay({
  message,
  onRetry,
  onDismiss,
  retryLabel = 'Try again',
}: ErrorDisplayProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-4 bg-error/10 border border-error/20 rounded-lg" role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle size={24} className="text-error shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-error leading-relaxed m-0">{message}</p>
      </div>
      <div className="flex gap-3 justify-end">
        {onRetry !== undefined && (
          <Button variant="default" size="sm" onClick={onRetry}>
            <RefreshCw size={16} />
            <span>{retryLabel}</span>
          </Button>
        )}
        {onDismiss !== undefined && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
