<script lang="ts">
  import type { AdminVocabularyItem } from '../../api-types';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';

  type LanguageOption = { value: string; label: string };

  type Props = {
    isEditDialogOpen: boolean;
    isCreateDialogOpen: boolean;
    isDeleteDialogOpen: boolean;
    editForm: {
      sourceText: string;
      targetText: string;
      sourceUsageExample: string | null | undefined;
      targetUsageExample: string | null | undefined;
      listName: string;
      difficultyLevel?: string;
    };
    createForm: {
      sourceText: string;
      targetText: string;
      sourceLanguage: string;
      targetLanguage: string;
      listName: string;
      difficultyLevel?: string;
      sourceUsageExample: string | null | undefined;
      targetUsageExample: string | null | undefined;
    };
    itemToDelete: AdminVocabularyItem | null;
    languageOptions: Array<{ value: string; label: string }>;
    difficultyOptions: Array<{ value: string; label: string }>;
    listNameOptions: Array<{ value: string; label: string }>;
    loading: boolean;
    onupdate: () => void;
    oncreate: () => void;
    onconfirmdelete: () => void;
  };

  /* eslint-disable prefer-const */
  let {
    isEditDialogOpen = $bindable(),
    isCreateDialogOpen = $bindable(),
    isDeleteDialogOpen = $bindable(),
    editForm = $bindable(),
    createForm = $bindable(),
    itemToDelete,
    languageOptions,
    difficultyOptions,
    listNameOptions,
    loading,
    onupdate,
    oncreate,
    onconfirmdelete,
  }: Props = $props();
/* eslint-enable prefer-const */
</script>

<Dialog.Root bind:open={isEditDialogOpen}>
  <Dialog.Content class="max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Edit Vocabulary Item</Dialog.Title>
      <Dialog.Description>Make changes to the vocabulary item. Click save when you're done.</Dialog.Description>
    </Dialog.Header>
    <div class="grid" style="gap: var(--spacing-md); padding-block: var(--spacing-md);">
      <div class="grid" style="gap: var(--spacing-xs);">
        <Label for="edit-source">Source Text</Label>
        <Input id="edit-source" bind:value={editForm.sourceText} />
      </div>
      <div class="grid" style="gap: var(--spacing-xs);">
        <Label for="edit-target">Target Text</Label>
        <Input id="edit-target" bind:value={editForm.targetText} />
      </div>
      <div class="grid" style="gap: var(--spacing-xs);">
        <Label for="edit-source-example">Source Example</Label>
        <Textarea
          id="edit-source-example"
          bind:value={editForm.sourceUsageExample}
          rows={3}
          placeholder="Enter usage example..." />
      </div>
      <div class="grid" style="gap: var(--spacing-xs);">
        <Label for="edit-target-example">Target Example</Label>
        <Textarea
          id="edit-target-example"
          bind:value={editForm.targetUsageExample}
          rows={3}
          placeholder="Enter translation example..." />
      </div>
      <div class="grid grid-cols-2" style="gap: var(--spacing-md);">
        <div class="grid" style="gap: var(--spacing-xs);">
          <Label>List Name</Label>
          <Select.Root type="single" bind:value={editForm.listName}>
            <Select.Trigger>
              {listNameOptions.find((l: LanguageOption) => l.value === editForm.listName)?.label || editForm.listName}
            </Select.Trigger>
            <Select.Content>
              {#each listNameOptions as list (list.value)}
                <Select.Item value={list.value}>{list.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <div class="grid" style="gap: var(--spacing-xs);">
          <Label>Difficulty Level</Label>
          <Select.Root type="single" bind:value={editForm.difficultyLevel}>
            <Select.Trigger>
              {difficultyOptions.find((d: LanguageOption) => d.value === editForm.difficultyLevel)?.label || 'Select'}
            </Select.Trigger>
            <Select.Content>
              {#each difficultyOptions as diff (diff.value)}
                <Select.Item value={diff.value}>{diff.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (isEditDialogOpen = false)}>Cancel</Button>
      <Button onclick={onupdate} disabled={loading}>
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={isCreateDialogOpen}>
  <Dialog.Content class="max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Create New Vocabulary Item</Dialog.Title>
      <Dialog.Description>Add a new vocabulary item to the database.</Dialog.Description>
    </Dialog.Header>
    <div class="grid" style="gap: var(--spacing-md); padding-block: var(--spacing-md);">
      <div class="grid grid-cols-2" style="gap: var(--spacing-md);">
        <div class="grid" style="gap: var(--spacing-xs);">
          <Label for="create-source">Source Text *</Label>
          <Input id="create-source" bind:value={createForm.sourceText} required />
        </div>
        <div class="grid" style="gap: var(--spacing-xs);">
          <Label for="create-target">Target Text *</Label>
          <Input id="create-target" bind:value={createForm.targetText} required />
        </div>
      </div>

      <div class="grid grid-cols-2" style="gap: var(--spacing-md);">
        <div class="grid" style="gap: var(--spacing-xs);">
          <Label>Source Language</Label>
          <Select.Root type="single" bind:value={createForm.sourceLanguage}>
            <Select.Trigger>
              {languageOptions.find((l: LanguageOption) => l.value === createForm.sourceLanguage)?.label || 'Select'}
            </Select.Trigger>
            <Select.Content>
              {#each languageOptions as lang (lang.value)}
                <Select.Item value={lang.value}>{lang.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <div class="grid" style="gap: var(--spacing-xs);">
          <Label>Target Language</Label>
          <Select.Root type="single" bind:value={createForm.targetLanguage}>
            <Select.Trigger>
              {languageOptions.find((l: LanguageOption) => l.value === createForm.targetLanguage)?.label || 'Select'}
            </Select.Trigger>
            <Select.Content>
              {#each languageOptions as lang (lang.value)}
                <Select.Item value={lang.value}>{lang.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <div class="grid grid-cols-2" style="gap: var(--spacing-md);">
        <div class="grid" style="gap: var(--spacing-xs);">
          <Label>List Name *</Label>
          <Select.Root type="single" bind:value={createForm.listName}>
            <Select.Trigger>
              {listNameOptions.find((l: LanguageOption) => l.value === createForm.listName)?.label || 'Select list'}
            </Select.Trigger>
            <Select.Content>
              {#each listNameOptions as list (list.value)}
                <Select.Item value={list.value}>{list.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <div class="grid" style="gap: var(--spacing-xs);">
          <Label>Difficulty Level</Label>
          <Select.Root type="single" bind:value={createForm.difficultyLevel}>
            <Select.Trigger>
              {difficultyOptions.find((d: LanguageOption) => d.value === createForm.difficultyLevel)?.label || 'Select'}
            </Select.Trigger>
            <Select.Content>
              {#each difficultyOptions as diff (diff.value)}
                <Select.Item value={diff.value}>{diff.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <div class="grid" style="gap: var(--spacing-xs);">
        <Label for="create-source-example">Source Example</Label>
        <Textarea
          id="create-source-example"
          bind:value={createForm.sourceUsageExample}
          rows={3}
          placeholder="Enter usage example..." />
      </div>
      <div class="grid" style="gap: var(--spacing-xs);">
        <Label for="create-target-example">Target Example</Label>
        <Textarea
          id="create-target-example"
          bind:value={createForm.targetUsageExample}
          rows={3}
          placeholder="Enter translation example..." />
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (isCreateDialogOpen = false)}>Cancel</Button>
      <Button onclick={oncreate} disabled={loading}>
        {loading ? 'Creating...' : 'Create Item'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={isDeleteDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Delete Vocabulary Item</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete this item? This will remove it from the list.
      </Dialog.Description>
    </Dialog.Header>
    {#if itemToDelete}
      <div class="rounded-lg bg-muted p-4">
        <p class="font-medium">{itemToDelete.sourceText}</p>
        <p class="text-muted-foreground">{itemToDelete.targetText}</p>
      </div>
    {/if}
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (isDeleteDialogOpen = false)}>Cancel</Button>
      <Button variant="destructive" onclick={onconfirmdelete} disabled={loading}>
        {loading ? 'Deleting...' : 'Delete'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
