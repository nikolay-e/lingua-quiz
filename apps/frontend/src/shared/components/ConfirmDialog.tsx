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
    </dialog>
  );
}
