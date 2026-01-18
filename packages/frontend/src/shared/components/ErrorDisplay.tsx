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
      <style>{`
        .error-display {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background-color: var(--color-error-bg);
          border: 1px solid var(--color-error-border);
          border-radius: var(--radius-md);
        }

        .error-content {
          display: flex;
          align-items: flex-start;
          gap: var(--spacing-sm);
        }

        .error-content .error-icon {
          color: var(--color-error);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .error-message {
          margin: 0;
          color: var(--color-error-text);
          line-height: 1.5;
        }

        .error-actions {
          display: flex;
          gap: var(--spacing-sm);
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
}
