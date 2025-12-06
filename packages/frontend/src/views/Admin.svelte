<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../stores';
  import adminApi, { type VocabularyItemCreate, type VocabularyItemUpdate } from '../adminApi';
  import type { AdminVocabularyItem } from '../api-types';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import AdminStats from '../components/admin/AdminStats.svelte';
  import VocabularySearch from '../components/admin/VocabularySearch.svelte';
  import VocabularyTable from '../components/admin/VocabularyTable.svelte';
  import VocabularyDialogs from '../components/admin/VocabularyDialogs.svelte';

  let token: string | null = null;
  let searchQuery = $state('');
  let searchResults = $state<AdminVocabularyItem[]>([]);
  let selectedItem = $state<AdminVocabularyItem | null>(null);
  let isEditDialogOpen = $state(false);
  let isCreateDialogOpen = $state(false);
  let isDeleteDialogOpen = $state(false);
  let itemToDelete = $state<AdminVocabularyItem | null>(null);
  let loading = $state(false);
  let searchLoading = $state(false);

  let editForm = $state<{
    sourceText: string;
    targetText: string;
    sourceUsageExample: string | null;
    targetUsageExample: string | null;
    listName: string;
    difficultyLevel?: string;
  }>({
    sourceText: '',
    targetText: '',
    sourceUsageExample: '',
    targetUsageExample: '',
    listName: '',
    difficultyLevel: '',
  });

  let createForm = $state<{
    sourceText: string;
    targetText: string;
    sourceLanguage: string;
    targetLanguage: string;
    listName: string;
    difficultyLevel?: string;
    sourceUsageExample: string | null;
    targetUsageExample: string | null;
  }>({
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

  const listNameOptions = [
    { value: 'english-russian-a0', label: 'English-Russian A0' },
    { value: 'english-russian-a1', label: 'English-Russian A1' },
    { value: 'english-russian-a2', label: 'English-Russian A2' },
    { value: 'english-russian-b1', label: 'English-Russian B1' },
    { value: 'english-russian-b2', label: 'English-Russian B2' },
    { value: 'german-russian-a0', label: 'German-Russian A0' },
    { value: 'german-russian-a1', label: 'German-Russian A1' },
    { value: 'german-russian-a2', label: 'German-Russian A2' },
    { value: 'german-russian-b1', label: 'German-Russian B1' },
    { value: 'german-russian-b2', label: 'German-Russian B2' },
    { value: 'spanish-russian-a0', label: 'Spanish-Russian A0' },
    { value: 'spanish-russian-a1', label: 'Spanish-Russian A1' },
    { value: 'spanish-russian-a2', label: 'Spanish-Russian A2' },
    { value: 'spanish-russian-b1', label: 'Spanish-Russian B1' },
    { value: 'spanish-russian-b2', label: 'Spanish-Russian B2' },
  ];

  const filteredResults = $derived.by(() => {
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
      if (sortBy === 'source') comparison = a.sourceText.localeCompare(b.sourceText);
      else if (sortBy === 'target') comparison = a.targetText.localeCompare(b.targetText);
      else if (sortBy === 'list') comparison = a.listName.localeCompare(b.listName);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return results;
  });

  const stats = $derived.by(() => {
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
      const results = await adminApi.searchVocabulary(token, searchQuery);
      searchResults = results;
      toast.success(`Found ${results.length} items`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Search failed';
      toast.error(message);
      searchResults = [];
    } finally {
      searchLoading = false;
    }
  }

  function openEditDialog(item: AdminVocabularyItem) {
    selectedItem = item;
    editForm = {
      sourceText: item.sourceText,
      targetText: item.targetText,
      sourceUsageExample: item.sourceUsageExample ?? '',
      targetUsageExample: item.targetUsageExample ?? '',
      listName: item.listName,
      difficultyLevel: item.difficultyLevel ?? '',
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
      if (editForm.sourceUsageExample !== (selectedItem.sourceUsageExample ?? '')) {updates.sourceUsageExample = editForm.sourceUsageExample || null;}
      if (editForm.targetUsageExample !== (selectedItem.targetUsageExample ?? '')) {updates.targetUsageExample = editForm.targetUsageExample || null;}
      if (editForm.listName !== selectedItem.listName) updates.listName = editForm.listName;
      if (editForm.difficultyLevel && editForm.difficultyLevel !== (selectedItem.difficultyLevel ?? '')) {updates.difficultyLevel = editForm.difficultyLevel;}

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save');
        isEditDialogOpen = false;
        return;
      }

      const updatedItem = await adminApi.updateVocabularyItem(token, selectedItem.id, updates);
      const index = searchResults.findIndex((item) => item.id === selectedItem?.id);
      const existingItem = searchResults[index];
      if (existingItem !== undefined) {
        searchResults[index] = { ...existingItem, ...updatedItem };
      }

      toast.success('Item updated successfully');
      isEditDialogOpen = false;
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

    loading = true;

    try {
      const payload: VocabularyItemCreate = {
        sourceText: createForm.sourceText,
        sourceLanguage: createForm.sourceLanguage,
        targetText: createForm.targetText,
        targetLanguage: createForm.targetLanguage,
        listName: createForm.listName,
        difficultyLevel: createForm.difficultyLevel ?? undefined,
        sourceUsageExample: createForm.sourceUsageExample || null,
        targetUsageExample: createForm.targetUsageExample || null,
      };

      await adminApi.createVocabularyItem(token, payload);
      toast.success('Item created successfully');
      isCreateDialogOpen = false;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Create failed';
      toast.error(message);
    } finally {
      loading = false;
    }
  }

  function openDeleteDialog(item: AdminVocabularyItem) {
    itemToDelete = item;
    isDeleteDialogOpen = true;
  }

  async function handleDeleteItem() {
    if (!token || !itemToDelete) return;

    loading = true;
    const deletedItemId = itemToDelete.id;

    try {
      await adminApi.deleteVocabularyItem(token, deletedItemId);
      searchResults = searchResults.filter((item) => item.id !== deletedItemId);
      toast.success('Item deleted successfully');
      isDeleteDialogOpen = false;
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
</script>

<main id="main-content" class="min-h-screen bg-background p-4">
  <div class="mx-auto max-w-7xl flex flex-col gap-6">
    <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-primary">Vocabulary Management</h1>
        <p class="text-muted-foreground">Search, create, and manage vocabulary items</p>
      </div>
      <Button onclick={openCreateDialog} class="w-full md:w-auto">
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

    <AdminStats {stats} />

    <VocabularySearch
      bind:searchQuery
      bind:filterLanguage
      bind:filterStatus
      bind:sortBy
      bind:sortOrder
      {searchLoading}
      {languageOptions}
      {listNameOptions}
      onsearch={handleSearch} />

    <VocabularyTable
      items={filteredResults}
      {sortBy}
      {sortOrder}
      onedit={(e) => openEditDialog(e.detail)}
      ondelete={(e) => openDeleteDialog(e.detail)}
      onsort={(e) => toggleSort(e.detail)} />
  </div>
</main>

<VocabularyDialogs
  bind:isEditDialogOpen
  bind:isCreateDialogOpen
  bind:isDeleteDialogOpen
  bind:editForm
  bind:createForm
  {itemToDelete}
  {languageOptions}
  {difficultyOptions}
  {listNameOptions}
  {loading}
  onupdate={handleUpdateItem}
  oncreate={handleCreateItem}
  onconfirmdelete={handleDeleteItem} />
