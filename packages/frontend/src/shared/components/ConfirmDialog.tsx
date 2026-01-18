import { useEffect, useRef } from 'react';
import { AlertTriangle, type LucideIcon } from 'lucide-react';
import { Button } from '@shared/ui';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: LucideIcon;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'destructive',
  onConfirm,
  onCancel,
  icon: IconComponent = AlertTriangle,
}: ConfirmDialogProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    if (open) {
      dialog.showModal();
      confirmButtonRef.current?.focus();
    } else {
      dialog.close();
    }
  }, [open]);

  const handleCancel = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    onCancel();
  };

  const handleClick = (e: React.MouseEvent): void => {
    if (e.target === dialogRef.current) {
      onCancel();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onCancel={handleCancel}
      onClick={handleClick}
    >
      <div className="confirm-dialog-content">
        <IconComponent size={20} className="warning-icon" />
        <span id="confirm-dialog-title" className="confirm-title text-base">
          {title}
        </span>
        <span id="confirm-dialog-desc" className="confirm-desc text-sm">
          {description}
        </span>
        <div className="confirm-actions">
          <Button ref={confirmButtonRef} size="sm" variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
      <style>{`
        .confirm-dialog {
          border: none;
          border-radius: var(--radius-lg);
          padding: 0;
          max-width: min(90vw, 400px);
          background: transparent;
        }

        .confirm-dialog::backdrop {
          background: rgb(0 0 0 / 0.5);
          backdrop-filter: blur(4px);
        }

        .confirm-dialog[open] {
          animation: dialog-appear 0.2s ease-out;
        }

        @keyframes dialog-appear {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .confirm-dialog-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-lg);
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          text-align: center;
          box-shadow: var(--shadow-xl);
        }

        .confirm-dialog .warning-icon {
          color: var(--color-secondary);
        }

        .confirm-title {
          font-weight: var(--font-weight-semibold);
        }

        .confirm-desc {
          color: var(--color-text-muted);
        }

        .confirm-actions {
          display: flex;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-sm);
        }

        @media (prefers-reduced-motion: reduce) {
          .confirm-dialog[open] {
            animation: none;
          }
        }
      `}</style>
    </dialog>
  );
}
