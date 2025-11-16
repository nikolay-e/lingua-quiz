<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../stores';
  import adminApi, { type VocabularyItemCreate, type VocabularyItemUpdate } from '../adminApi';
  import type { VocabularyItem } from '../api-types';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Badge } from '$lib/components/ui/badge';
  import * as Card from '$lib/components/ui/card';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import * as Table from '$lib/components/ui/table';
  import { Label } from '$lib/components/ui/label';
  import { Separator } from '$lib/components/ui/separator';

  let token: string | null = null;
  let searchQuery = $state('');
  let searchResults = $state<VocabularyItem[]>([]);
  let selectedItem = $state<VocabularyItem | null>(null);
  let isEditDialogOpen = $state(false);
  let isCreateDialogOpen = $state(false);
  let isDeleteDialogOpen = $state(false);
  let itemToDelete = $state<VocabularyItem | null>(null);
  let loading = $state(false);
  let searchLoading = $state(false);

  let editForm = $state({
    sourceText: '',
    targetText: '',
    sourceUsageExample: '',
    targetUsageExample: '',
  });

  let createForm = $state<VocabularyItemCreate>({
    sourceText: '',
    sourceLanguage: 'en',
    targetText: '',
    targetLanguage: 'ru',
    listName: '',
    difficultyLevel: 'A1',
    sourceUsageExample: '',
    targetUsageExample: '',
  });

  let filterLanguage = $state('all');
  let filterStatus = $state('all');
  let sortBy = $state<'source' | 'target' | 'list'>('source');
  let sortOrder = $state<'asc' | 'desc'>('asc');

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'de', label: 'German' },
    { value: 'es', label: 'Spanish' },
    { value: 'ru', label: 'Russian' },
  ];

  const difficultyOptions = [
    { value: 'A1', label: 'A1 - Beginner' },
    { value: 'A2', label: 'A2 - Elementary' },
    { value: 'B1', label: 'B1 - Intermediate' },
    { value: 'B2', label: 'B2 - Upper Intermediate' },
    { value: 'C1', label: 'C1 - Advanced' },
    { value: 'C2', label: 'C2 - Proficiency' },
  ];

  const filteredResults = $derived(() => {
    let results = [...searchResults];

    if (filterLanguage !== 'all') {
      results = results.filter(
        (item) => item.sourceLanguage === filterLanguage || item.targetLanguage === filterLanguage,
      );
    }

    if (filterStatus !== 'all') {
      results = results.filter((item) => (filterStatus === 'active' ? item.isActive : !item.isActive));
    }

    results.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'source') {
        comparison = a.sourceText.localeCompare(b.sourceText);
      } else if (sortBy === 'target') {
        comparison = a.targetText.localeCompare(b.targetText);
      } else if (sortBy === 'list') {
        comparison = a.listName.localeCompare(b.listName);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return results;
  });

  const stats = $derived(() => {
    const total = searchResults.length;
    const active = searchResults.filter((item) => item.isActive).length;
    const inactive = total - active;
    const languages = new Set(searchResults.flatMap((item) => [item.sourceLanguage, item.targetLanguage]));
    return { total, active, inactive, languageCount: languages.size };
  });

  const unsubscribe = authStore.subscribe(({ token: authToken }) => {
    token = authToken;
  });

  onMount(() => {
    return () => {
      unsubscribe();
    };
  });

  async function handleSearch() {
    if (!token || !searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    searchLoading = true;

    try {
      searchResults = await adminApi.searchVocabulary(token, searchQuery, 100);
      if (searchResults.length === 0) {
        toast.info('No results found');
      } else {
        toast.success(`Found ${searchResults.length} items`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Search failed';
      toast.error(message);
    } finally {
      searchLoading = false;
    }
  }

  function openEditDialog(item: VocabularyItem) {
    selectedItem = item;
    editForm = {
      sourceText: item.sourceText,
      targetText: item.targetText,
      sourceUsageExample: item.sourceUsageExample || '',
      targetUsageExample: item.targetUsageExample || '',
    };
    isEditDialogOpen = true;
  }

  async function handleUpdateItem() {
    if (!token || !selectedItem) return;

    loading = true;

    try {
      const updates: VocabularyItemUpdate = {};
      if (editForm.sourceText !== selectedItem.sourceText) updates.sourceText = editForm.sourceText;
      if (editForm.targetText !== selectedItem.targetText) updates.targetText = editForm.targetText;
      if (editForm.sourceUsageExample !== (selectedItem.sourceUsageExample || '')) {updates.sourceUsageExample = editForm.sourceUsageExample;}
      if (editForm.targetUsageExample !== (selectedItem.targetUsageExample || '')) {updates.targetUsageExample = editForm.targetUsageExample;}

      if (Object.keys(updates).length === 0) {
        toast.warning('No changes to save');
        loading = false;
        return;
      }

      await adminApi.updateVocabularyItem(token, selectedItem.id, updates);
      toast.success('Vocabulary item updated successfully');

      const index = searchResults.findIndex((item) => item.id === selectedItem?.id);
      const existingItem = searchResults[index];
      if (index !== -1 && selectedItem && existingItem) {
        searchResults[index] = {
          ...existingItem,
          sourceText: updates.sourceText ?? existingItem.sourceText,
          targetText: updates.targetText ?? existingItem.targetText,
          sourceUsageExample: updates.sourceUsageExample ?? existingItem.sourceUsageExample,
          targetUsageExample: updates.targetUsageExample ?? existingItem.targetUsageExample,
        } as VocabularyItem;
        searchResults = [...searchResults];
      }

      isEditDialogOpen = false;
      selectedItem = null;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Update failed';
      toast.error(message);
    } finally {
      loading = false;
    }
  }

  function openCreateDialog() {
    createForm = {
      sourceText: '',
      sourceLanguage: 'en',
      targetText: '',
      targetLanguage: 'ru',
      listName: '',
      difficultyLevel: 'A1',
      sourceUsageExample: '',
      targetUsageExample: '',
    };
    isCreateDialogOpen = true;
  }

  async function handleCreateItem() {
    if (!token) return;

    if (!createForm.sourceText.trim() || !createForm.targetText.trim() || !createForm.listName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    loading = true;

    try {
      await adminApi.createVocabularyItem(token, createForm);
      toast.success('Vocabulary item created successfully');
      isCreateDialogOpen = false;

      if (searchQuery) {
        await handleSearch();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Create failed';
      toast.error(message);
    } finally {
      loading = false;
    }
  }

  function openDeleteDialog(item: VocabularyItem) {
    itemToDelete = item;
    isDeleteDialogOpen = true;
  }

  async function handleDeleteItem() {
    if (!token || !itemToDelete) return;

    loading = true;
    const deletedItemId = itemToDelete.id;

    try {
      await adminApi.deleteVocabularyItem(token, deletedItemId);
      toast.success('Vocabulary item deleted successfully');
      searchResults = searchResults.filter((item) => item.id !== deletedItemId);
      isDeleteDialogOpen = false;

      if (selectedItem?.id === deletedItemId) {
        selectedItem = null;
      }

      itemToDelete = null;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Delete failed';
      toast.error(message);
    } finally {
      loading = false;
    }
  }

  function toggleSort(column: 'source' | 'target' | 'list') {
    if (sortBy === column) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = column;
      sortOrder = 'asc';
    }
  }

  function getSortIcon(column: 'source' | 'target' | 'list'): string {
    if (sortBy !== column) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  }
</script>

<div class="min-h-screen bg-background p-4 md:p-6 lg:p-8">
  <div class="mx-auto max-w-7xl space-y-6">
    <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-3xl font-bold text-primary">Vocabulary Management</h1>
        <p class="text-muted-foreground">Search, create, and manage vocabulary items</p>
      </div>
      <Button onclick={openCreateDialog} size="lg" class="w-full md:w-auto">
        <svg
          class="mr-2 size-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4" />
        </svg>
        Create New Item
      </Button>
    </header>

    {#if searchResults.length > 0}
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card.Root>
          <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card.Title class="text-sm font-medium">Total Items</Card.Title>
            <svg
              class="size-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /><!-- eslint-disable-line max-len -->
            </svg>
          </Card.Header>
          <Card.Content>
            <div class="text-2xl font-bold">{stats().total}</div>
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card.Title class="text-sm font-medium">Active Items</Card.Title>
            <svg
              class="size-4 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7" />
            </svg>
          </Card.Header>
          <Card.Content>
            <div class="text-2xl font-bold text-success">{stats().active}</div>
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card.Title class="text-sm font-medium">Inactive Items</Card.Title>
            <svg
              class="size-4 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Card.Header>
          <Card.Content>
            <div class="text-2xl font-bold text-destructive">{stats().inactive}</div>
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card.Title class="text-sm font-medium">Languages</Card.Title>
            <svg
              class="size-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /><!-- eslint-disable-line max-len -->
            </svg>
          </Card.Header>
          <Card.Content>
            <div class="text-2xl font-bold">{stats().languageCount}</div>
          </Card.Content>
        </Card.Root>
      </div>
    {/if}

    <Card.Root>
      <Card.Header>
        <Card.Title>Search Vocabulary</Card.Title>
        <Card.Description>Search by source or target text using full-text search</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="relative flex-1">
            <Input
              type="text"
              placeholder="Enter search term..."
              bind:value={searchQuery}
              onkeydown={(e) => e.key === 'Enter' && handleSearch()}
              class="pr-10"
            />
            {#if searchLoading}
              <div class="absolute right-3 top-1/2 -translate-y-1/2">
                <svg class="size-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"></circle>
                  <!-- eslint-disable-next-line max-len -->
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            {/if}
          </div>
          <Button onclick={handleSearch} disabled={searchLoading || !searchQuery.trim()} class="md:w-32">
            {searchLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {#if searchResults.length > 0}
          <Separator />
          <div class="flex flex-col gap-4 md:flex-row md:items-center">
            <div class="flex items-center gap-2">
              <Label class="text-sm font-medium">Language:</Label>
              <Select.Root type="single" bind:value={filterLanguage}>
                <Select.Trigger class="w-40">
                  {filterLanguage === 'all'
                    ? 'All Languages'
                    : languageOptions.find((l) => l.value === filterLanguage)?.label ||
                      filterLanguage}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">All Languages</Select.Item>
                  {#each languageOptions as lang (lang.value)}
                    <Select.Item value={lang.value}>{lang.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>

            <div class="flex items-center gap-2">
              <Label class="text-sm font-medium">Status:</Label>
              <Select.Root type="single" bind:value={filterStatus}>
                <Select.Trigger class="w-32">
                  {#if filterStatus === 'all'}
                    All
                  {:else if filterStatus === 'active'}
                    Active
                  {:else}
                    Inactive
                  {/if}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">All</Select.Item>
                  <Select.Item value="active">Active</Select.Item>
                  <Select.Item value="inactive">Inactive</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>

            <div class="ml-auto text-sm text-muted-foreground">
              Showing {filteredResults().length} of {searchResults.length} items
            </div>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>

    {#if filteredResults().length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Search Results</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="overflow-x-auto">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head class="cursor-pointer hover:text-primary" onclick={() => toggleSort('source')}>
                    Source Text {getSortIcon('source')}
                  </Table.Head>
                  <Table.Head class="cursor-pointer hover:text-primary" onclick={() => toggleSort('target')}>
                    Target Text {getSortIcon('target')}
                  </Table.Head>
                  <Table.Head class="cursor-pointer hover:text-primary" onclick={() => toggleSort('list')}>
                    List Name {getSortIcon('list')}
                  </Table.Head>
                  <Table.Head>Languages</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head class="text-right">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each filteredResults() as item (item.id)}
                  <Table.Row class={item.isActive ? '' : 'opacity-50'}>
                    <Table.Cell class="max-w-xs truncate font-medium">{item.sourceText}</Table.Cell>
                    <Table.Cell class="max-w-xs truncate">{item.targetText}</Table.Cell>
                    <Table.Cell>
                      <Badge variant="outline">{item.listName}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <div class="flex gap-1">
                        <Badge variant="secondary" class="text-xs">{item.sourceLanguage.toUpperCase()}</Badge>
                        <span class="text-muted-foreground">→</span>
                        <Badge variant="secondary" class="text-xs">{item.targetLanguage.toUpperCase()}</Badge>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      {#if item.isActive}
                        <Badge class="bg-success text-white">Active</Badge>
                      {:else}
                        <Badge variant="destructive">Inactive</Badge>
                      {/if}
                    </Table.Cell>
                    <Table.Cell class="text-right">
                      <div class="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onclick={() => openEditDialog(item)}>
                          <svg
                            class="mr-1 size-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /><!-- eslint-disable-line max-len -->
                          </svg>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onclick={() => openDeleteDialog(item)}>
                          <svg
                            class="mr-1 size-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /><!-- eslint-disable-line max-len -->
                          </svg>
                          Delete
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  </div>
</div>

<Dialog.Root bind:open={isEditDialogOpen}>
  <Dialog.Content class="max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Edit Vocabulary Item</Dialog.Title>
      <Dialog.Description>Make changes to the vocabulary item. Click save when you're done.</Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid gap-2">
        <Label for="edit-source">Source Text</Label>
        <Input id="edit-source" bind:value={editForm.sourceText} />
      </div>
      <div class="grid gap-2">
        <Label for="edit-target">Target Text</Label>
        <Input id="edit-target" bind:value={editForm.targetText} />
      </div>
      <div class="grid gap-2">
        <Label for="edit-source-example">Source Example</Label>
        <Textarea
          id="edit-source-example"
          bind:value={editForm.sourceUsageExample}
          rows={3}
          placeholder="Enter usage example..." />
      </div>
      <div class="grid gap-2">
        <Label for="edit-target-example">Target Example</Label>
        <Textarea
          id="edit-target-example"
          bind:value={editForm.targetUsageExample}
          rows={3}
          placeholder="Enter translation example..." />
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (isEditDialogOpen = false)}>Cancel</Button>
      <Button onclick={handleUpdateItem} disabled={loading}>
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
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="grid gap-2">
          <Label for="create-source">Source Text *</Label>
          <Input id="create-source" bind:value={createForm.sourceText} required />
        </div>
        <div class="grid gap-2">
          <Label for="create-target">Target Text *</Label>
          <Input id="create-target" bind:value={createForm.targetText} required />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="grid gap-2">
          <Label>Source Language</Label>
          <Select.Root type="single" bind:value={createForm.sourceLanguage}>
            <Select.Trigger>
              {languageOptions.find((l) => l.value === createForm.sourceLanguage)?.label || 'Select'}
            </Select.Trigger>
            <Select.Content>
              {#each languageOptions as lang (lang.value)}
                <Select.Item value={lang.value}>{lang.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <div class="grid gap-2">
          <Label>Target Language</Label>
          <Select.Root type="single" bind:value={createForm.targetLanguage}>
            <Select.Trigger>
              {languageOptions.find((l) => l.value === createForm.targetLanguage)?.label || 'Select'}
            </Select.Trigger>
            <Select.Content>
              {#each languageOptions as lang (lang.value)}
                <Select.Item value={lang.value}>{lang.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="grid gap-2">
          <Label for="create-list">List Name *</Label>
          <Input
            id="create-list"
            bind:value={createForm.listName}
            placeholder="e.g., english-russian-a1"
            required />
        </div>
        <div class="grid gap-2">
          <Label>Difficulty Level</Label>
          <Select.Root type="single" bind:value={createForm.difficultyLevel}>
            <Select.Trigger>
              {difficultyOptions.find((d) => d.value === createForm.difficultyLevel)?.label || 'Select'}
            </Select.Trigger>
            <Select.Content>
              {#each difficultyOptions as diff (diff.value)}
                <Select.Item value={diff.value}>{diff.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <div class="grid gap-2">
        <Label for="create-source-example">Source Example</Label>
        <Textarea
          id="create-source-example"
          bind:value={createForm.sourceUsageExample}
          rows={3}
          placeholder="Enter usage example..." />
      </div>
      <div class="grid gap-2">
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
      <Button onclick={handleCreateItem} disabled={loading}>
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
        Are you sure you want to delete this item? This action will mark it as inactive.
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
      <Button variant="destructive" onclick={handleDeleteItem} disabled={loading}>
        {loading ? 'Deleting...' : 'Delete'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
