import { useId } from 'react';
import { Loader2 } from 'lucide-react';
import { LANGUAGE_OPTIONS, DIFFICULTY_OPTIONS, LIST_NAME_OPTIONS } from '@features/admin/config/adminConfig';
import { Button, Input, Label, Select, Card, CardContent } from '@shared/ui';
import { BaseDialog } from '@shared/components';
import type { CreateForm } from './types';

interface AdminCreateDialogProps {
  open: boolean;
  onClose: () => void;
  createForm: CreateForm;
  onCreateFormChange: (form: CreateForm) => void;
  onCreate: () => void;
  loading: boolean;
}

export function AdminCreateDialog({
  open,
  onClose,
  createForm,
  onCreateFormChange,
  onCreate,
  loading,
}: AdminCreateDialogProps): React.JSX.Element {
  const titleId = useId();

  return (
    <BaseDialog open={open} onClose={onClose} titleId={titleId}>
      <Card className="max-h-[90vh] overflow-y-auto">
        <CardContent className="pt-6">
          <h2 id={titleId} className="text-xl font-semibold mb-4">
            Create Vocabulary Item
          </h2>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-source-lang">Source Language</Label>
                <Select
                  id="create-source-lang"
                  value={createForm.sourceLanguage}
                  onValueChange={(val) => {
                    onCreateFormChange({ ...createForm, sourceLanguage: val });
                  }}
                  options={LANGUAGE_OPTIONS}
                />
              </div>
              <div>
                <Label htmlFor="create-target-lang">Target Language</Label>
                <Select
                  id="create-target-lang"
                  value={createForm.targetLanguage}
                  onValueChange={(val) => {
                    onCreateFormChange({ ...createForm, targetLanguage: val });
                  }}
                  options={LANGUAGE_OPTIONS}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="create-source-text">Source Text</Label>
              <Input
                id="create-source-text"
                value={createForm.sourceText}
                onChange={(e) => {
                  onCreateFormChange({ ...createForm, sourceText: e.target.value });
                }}
              />
            </div>
            <div>
              <Label htmlFor="create-target-text">Target Text</Label>
              <Input
                id="create-target-text"
                value={createForm.targetText}
                onChange={(e) => {
                  onCreateFormChange({ ...createForm, targetText: e.target.value });
                }}
              />
            </div>
            <div>
              <Label htmlFor="create-source-example">Source Example</Label>
              <Input
                id="create-source-example"
                value={createForm.sourceUsageExample ?? ''}
                onChange={(e) => {
                  onCreateFormChange({ ...createForm, sourceUsageExample: e.target.value });
                }}
              />
            </div>
            <div>
              <Label htmlFor="create-target-example">Target Example</Label>
              <Input
                id="create-target-example"
                value={createForm.targetUsageExample ?? ''}
                onChange={(e) => {
                  onCreateFormChange({ ...createForm, targetUsageExample: e.target.value });
                }}
              />
            </div>
            <div>
              <Label htmlFor="create-list-name">List Name</Label>
              <Select
                id="create-list-name"
                value={createForm.listName}
                onValueChange={(val) => {
                  onCreateFormChange({ ...createForm, listName: val });
                }}
                options={LIST_NAME_OPTIONS}
              />
            </div>
            <div>
              <Label htmlFor="create-difficulty">Difficulty</Label>
              <Select
                id="create-difficulty"
                value={createForm.difficultyLevel}
                onValueChange={(val) => {
                  onCreateFormChange({ ...createForm, difficultyLevel: val });
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
                  void onCreate();
                }}
                disabled={loading}
                className="flex-1"
              >
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Create Item
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </BaseDialog>
  );
}
