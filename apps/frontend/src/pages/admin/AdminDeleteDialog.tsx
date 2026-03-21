import type { AdminVocabularyItem } from '@api/types';
import { ConfirmDialog } from '@shared/components';

interface AdminDeleteDialogProps {
  open: boolean;
  item: AdminVocabularyItem | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AdminDeleteDialog({
  open,
  item,
  onConfirm,
  onCancel,
}: AdminDeleteDialogProps): React.JSX.Element | null {
  if (!open || item === null) return null;

  return (
    <ConfirmDialog
      open={open}
      title="Delete Vocabulary Item"
      description={`Are you sure you want to delete "${item.sourceText}"? This action cannot be undone.`}
      confirmLabel="Delete"
      onConfirm={() => {
        void onConfirm();
      }}
      onCancel={onCancel}
    />
  );
}
