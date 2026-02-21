import { useEffect, useRef } from 'react';

interface BaseDialogProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
  titleId?: string;
  descriptionId?: string;
  className?: string;
  children: React.ReactNode;
}

const DEFAULT_CLASS =
  'border-none rounded-lg p-0 max-w-[min(90vw,28rem)] w-full bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm';

export function BaseDialog({
  open,
  onClose,
  onOpen,
  titleId,
  descriptionId,
  className = DEFAULT_CLASS,
  children,
}: BaseDialogProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    if (open && !dialog.open) {
      dialog.showModal();
      onOpen?.();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, onOpen]);

  const handleCancel = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    onClose();
  };

  const handleClick = (e: React.MouseEvent): void => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={className}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      {children}
    </dialog>
  );
}
