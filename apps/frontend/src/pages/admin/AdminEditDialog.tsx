import { useId } from 'react';
import { Loader2 } from 'lucide-react';
import { DIFFICULTY_OPTIONS, LIST_NAME_OPTIONS } from '@features/admin/config/adminConfig';
import { Button, Input, Label, Select, Card, CardContent } from '@shared/ui';
import { BaseDialog } from '@shared/components';
import type { EditForm } from './types';

interface AdminEditDialogProps {
  open: boolean;
  onClose: () => void;
  editForm: EditForm;
  onEditFormChange: (form: EditForm) => void;
  onSave: () => void;
  loading: boolean;
}

export function AdminEditDialog({
  open,
  onClose,
  editForm,
  onEditFormChange,
  onSave,
  loading,
}: AdminEditDialogProps): React.JSX.Element {
  const titleId = useId();

  return (
    <BaseDialog open={open} onClose={onClose} titleId={titleId}>
      <Card className="max-h-[90vh] overflow-y-auto">
        <CardContent className="pt-6">
          <h2 id={titleId} className="text-xl font-semibold mb-4">
            Edit Vocabulary Item
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="edit-source-text">Source Text</Label>
              <Input
                id="edit-source-text"
                value={editForm.sourceText}
                onChange={(e) => {
                  onEditFormChange({ ...editForm, sourceText: e.target.value });
                }}
              />
            </div>
            <div>
              <Label htmlFor="edit-target-text">Target Text</Label>
              <Input
                id="edit-target-text"
                value={editForm.targetText}
                onChange={(e) => {
                  onEditFormChange({ ...editForm, targetText: e.target.value });
                }}
              />
            </div>
            <div>
              <Label htmlFor="edit-source-example">Source Example</Label>
              <Input
                id="edit-source-example"
                value={editForm.sourceUsageExample ?? ''}
                onChange={(e) => {
                  onEditFormChange({ ...editForm, sourceUsageExample: e.target.value });
                }}
              />
            </div>
            <div>
              <Label htmlFor="edit-target-example">Target Example</Label>
              <Input
                id="edit-target-example"
                value={editForm.targetUsageExample ?? ''}
                onChange={(e) => {
                  onEditFormChange({ ...editForm, targetUsageExample: e.target.value });
                }}
              />
            </div>
            <div>
              <Label htmlFor="edit-list-name">List Name</Label>
              <Select
                id="edit-list-name"
                value={editForm.listName}
                onValueChange={(val) => {
                  onEditFormChange({ ...editForm, listName: val });
                }}
                options={LIST_NAME_OPTIONS}
              />
            </div>
            <div>
              <Label htmlFor="edit-difficulty">Difficulty</Label>
              <Select
                id="edit-difficulty"
                value={editForm.difficultyLevel}
                onValueChange={(val) => {
                  onEditFormChange({ ...editForm, difficultyLevel: val });
                }}
                options={DIFFICULTY_OPTIONS}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void onSave();
                }}
                disabled={loading}
                className="flex-1"
              >
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </BaseDialog>
  );
}
