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
    <div className="error-display" role="alert">
      <div className="error-content">
        <AlertCircle size={24} className="error-icon" />
        <p className="error-message text-sm">{message}</p>
      </div>
      <div className="error-actions">
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
