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
      className="border-none rounded-lg p-0 max-w-[min(90vw,400px)] bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onCancel={handleCancel}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center gap-2 p-6 bg-surface border border-border rounded-lg text-center shadow-xl">
        <IconComponent size={20} className="text-secondary" aria-hidden="true" />
        <span id="confirm-dialog-title" className="text-base font-semibold">
          {title}
        </span>
        <span id="confirm-dialog-desc" className="text-sm text-muted-foreground">
          {description}
        </span>
        <div className="flex gap-3 mt-3">
          <Button
            ref={confirmButtonRef}
            size="sm"
            variant={confirmVariant}
            onClick={onConfirm}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} aria-label={cancelLabel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
