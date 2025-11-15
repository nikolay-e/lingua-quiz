<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { authStore } from '../stores';
  import adminApi, { type VocabularyItemCreate, type VocabularyItemUpdate } from '../adminApi';
  import type { VocabularyItem } from '../api-types';
  import { Toast, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Button, Badge, Modal, Label, Input, Textarea, Select } from 'flowbite-svelte';
  import { CheckCircle, XCircle, Info, Trash2, Plus, SearchIcon, X } from 'lucide-svelte';

  let token: string | null = null;
  let searchQuery = '';
  let searchResults: VocabularyItem[] = [];
  let selectedItem: VocabularyItem | null = null;
  let showEditModal = false;
  let showCreateModal = false;
  let loading = false;
  let searchDebounceTimer: NodeJS.Timeout | null = null;
  let toastMessage = '';
  let toastType: 'success' | 'error' | 'info' = 'info';
  let showToast = false;

  let editForm = {
    sourceText: '',
    targetText: '',
    sourceUsageExample: '',
    targetUsageExample: '',
  };

  let createForm: VocabularyItemCreate = {
    sourceText: '',
    sourceLanguage: 'en',
    targetText: '',
    targetLanguage: 'ru',
    listName: 'english-russian-a1',
    difficultyLevel: 'A1',
    sourceUsageExample: '',
    targetUsageExample: '',
  };

  const unsubscribe = authStore.subscribe(({ token: authToken }) => {
    token = authToken;
  });

  onMount(() => {
    document.addEventListener('keydown', handleGlobalKeydown);
    return () => {
      unsubscribe();
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  });

  onDestroy(() => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  });

  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
    if (e.key === 'Escape') {
      if (showEditModal) closeEditModal();
      if (showCreateModal) closeCreateModal();
    }
  }

  function showToastMessage(message: string, type: 'success' | 'error' | 'info' = 'info') {
    toastMessage = message;
    toastType = type;
    showToast = true;
    setTimeout(() => {
      showToast = false;
    }, 3000);
  }

  function debouncedSearch() {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      handleSearch();
    }, 500);
  }

  async function handleSearch() {
    if (!token || !searchQuery.trim()) {
      searchResults = [];
      return;
    }

    loading = true;

    try {
      searchResults = await adminApi.searchVocabulary(token, searchQuery);
      if (searchResults.length === 0) {
        showToastMessage('No results found', 'info');
      }
    } catch (e) {
      showToastMessage(e instanceof Error ? e.message : 'Search failed', 'error');
    } finally {
      loading = false;
    }
  }

  function openEditModal(item: VocabularyItem) {
    selectedItem = item;
    showEditModal = true;
    editForm = {
      sourceText: item.sourceText,
      targetText: item.targetText,
      sourceUsageExample: item.sourceUsageExample || '',
      targetUsageExample: item.targetUsageExample || '',
    };
  }

  function closeEditModal() {
    showEditModal = false;
    selectedItem = null;
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
        showToastMessage('No changes to save', 'info');
        loading = false;
        return;
      }

      await adminApi.updateVocabularyItem(token, selectedItem.id, updates);
      showToastMessage('✓ Vocabulary item updated successfully', 'success');
      closeEditModal();
      if (searchQuery) await handleSearch();
    } catch (e) {
      showToastMessage(e instanceof Error ? e.message : 'Update failed', 'error');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    showCreateModal = true;
    createForm = {
      sourceText: '',
      sourceLanguage: 'en',
      targetText: '',
      targetLanguage: 'ru',
      listName: 'english-russian-a1',
      difficultyLevel: 'A1',
      sourceUsageExample: '',
      targetUsageExample: '',
    };
  }

  function closeCreateModal() {
    showCreateModal = false;
  }

  async function handleCreateItem() {
    if (!token) return;

    loading = true;

    try {
      await adminApi.createVocabularyItem(token, createForm);
      showToastMessage('✓ Vocabulary item created successfully', 'success');
      closeCreateModal();
      if (searchQuery) await handleSearch();
    } catch (e) {
      showToastMessage(e instanceof Error ? e.message : 'Create failed', 'error');
    } finally {
      loading = false;
    }
  }

  async function handleDeleteItem(item: VocabularyItem) {
    if (
      !token ||
      !confirm(`Are you sure you want to delete "${item.sourceText} → ${item.targetText}"?`)
    ) {return;}

    loading = true;

    try {
      await adminApi.deleteVocabularyItem(token, item.id);
      showToastMessage('✓ Vocabulary item deleted', 'success');
      searchResults = searchResults.filter((i) => i.id !== item.id);
      if (selectedItem?.id === item.id) {
        closeEditModal();
      }
    } catch (e) {
      showToastMessage(e instanceof Error ? e.message : 'Delete failed', 'error');
    } finally {
      loading = false;
    }
  }
</script>

<div class="admin-wrapper">
  <!-- Header -->
  <header class="admin-header">
    <div class="header-content">
      <div class="header-title">
        <h1>📚 Vocabulary Manager</h1>
        <p class="subtitle">Admin Panel</p>
      </div>
      <div class="header-stats">
        <div class="stat-card">
          <div class="stat-value">{searchResults.length}</div>
          <div class="stat-label">Results</div>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="admin-main">
    <!-- Search Section -->
    <div class="search-section">
      <div class="flex gap-4 items-center">
        <div class="flex-1 relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <SearchIcon class="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <Input
            id="search-input"
            bind:value={searchQuery}
            on:input={debouncedSearch}
            on:keydown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search vocabulary... (Ctrl+K)"
            size="lg"
            class="pl-10 {searchQuery ? 'pr-10' : ''}" />
          {#if searchQuery}
            <button
              type="button"
              on:click={() => {
                searchQuery = '';
                searchResults = [];
              }}
              class="absolute inset-y-0 right-0 flex items-center pr-3
                text-gray-500 hover:text-gray-700
                dark:text-gray-400 dark:hover:text-gray-200">
              <X class="w-5 h-5" />
            </button>
          {/if}
        </div>
        <Button on:click={openCreateModal} disabled={loading} size="lg">
          <Plus class="w-5 h-5 mr-2" />
          Create New
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    {#if loading && searchResults.length === 0}
      <div class="loading-skeleton">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>
    {/if}

    <!-- Empty State -->
    {#if !loading && searchResults.length === 0 && searchQuery}
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No results found</h3>
        <p>Try searching for different keywords or create a new vocabulary item.</p>
      </div>
    {/if}

    {#if !loading && searchResults.length === 0 && !searchQuery}
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>Start searching</h3>
        <p>Use the search bar above to find vocabulary items, or create a new one.</p>
        <div class="keyboard-hint">
          Press <kbd>Ctrl</kbd> + <kbd>K</kbd> to focus search
        </div>
      </div>
    {/if}

    <!-- Results Table -->
    {#if searchResults.length > 0}
      <div class="overflow-x-auto shadow-md rounded-lg">
        <Table hoverable={true} striped={true}>
          <TableHead>
            <TableHeadCell>Source</TableHeadCell>
            <TableHeadCell>Target</TableHeadCell>
            <TableHeadCell>Languages</TableHeadCell>
            <TableHeadCell>List</TableHeadCell>
            <TableHeadCell>Examples</TableHeadCell>
            <TableHeadCell>
              <span class="sr-only">Actions</span>
            </TableHeadCell>
          </TableHead>
          <TableBody>
            {#each searchResults as item (item.id)}
              <TableBodyRow class={!item.isActive ? 'opacity-50' : ''}>
                <TableBodyCell class="font-medium">{item.sourceText}</TableBodyCell>
                <TableBodyCell>{item.targetText}</TableBodyCell>
                <TableBodyCell>
                  <div class="flex items-center gap-1">
                    <Badge color="blue">{item.sourceLanguage.toUpperCase()}</Badge>
                    <span class="text-gray-500">→</span>
                    <Badge color="green">{item.targetLanguage.toUpperCase()}</Badge>
                  </div>
                </TableBodyCell>
                <TableBodyCell>
                  <Badge color="purple">{item.listName}</Badge>
                </TableBodyCell>
                <TableBodyCell>
                  {#if item.sourceUsageExample || item.targetUsageExample}
                    <div class="text-sm space-y-1">
                      {#if item.sourceUsageExample}
                        <div class="text-gray-600 dark:text-gray-400">
                          <span class="font-semibold">Ex:</span> {item.sourceUsageExample}
                        </div>
                      {/if}
                      {#if item.targetUsageExample}
                        <div class="text-gray-600 dark:text-gray-400">
                          <span class="font-semibold">Tr:</span> {item.targetUsageExample}
                        </div>
                      {/if}
                    </div>
                  {:else}
                    <span class="text-gray-400">—</span>
                  {/if}
                </TableBodyCell>
                <TableBodyCell>
                  <div class="flex items-center gap-2">
                    <Button size="xs" color="blue" on:click={() => openEditModal(item)}>
                      <Edit class="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="xs" color="red" on:click={() => handleDeleteItem(item)}>
                      <Trash2 class="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {/if}
  </main>

  <!-- Edit Modal -->
  <Modal
    bind:open={showEditModal}
    size="md"
    autoclose={false}
    class="w-full">
    <form on:submit|preventDefault={handleUpdateItem} class="space-y-6">
      <h3 class="text-xl font-medium text-gray-900 dark:text-white flex items-center gap-2">
        <Edit class="w-5 h-5" />
        Edit Vocabulary Item
      </h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="edit-source" class="mb-2">Source Text *</Label>
          <Input id="edit-source" bind:value={editForm.sourceText} required />
        </div>
        <div>
          <Label for="edit-target" class="mb-2">Target Text *</Label>
          <Input id="edit-target" bind:value={editForm.targetText} required />
        </div>
      </div>
      <div>
        <Label for="edit-source-example" class="mb-2">Source Example (optional)</Label>
        <Textarea
          id="edit-source-example"
          rows="2"
          bind:value={editForm.sourceUsageExample}
          placeholder="Example sentence in source language" />
      </div>
      <div>
        <Label for="edit-target-example" class="mb-2">Target Example (optional)</Label>
        <Textarea
          id="edit-target-example"
          rows="2"
          bind:value={editForm.targetUsageExample}
          placeholder="Example sentence in target language" />
      </div>
      <div class="flex justify-end gap-2">
        <Button color="alternative" on:click={closeEditModal} disabled={loading}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
      </div>
    </form>
  </Modal>

  <!-- Create Modal -->
  <Modal
    bind:open={showCreateModal}
    size="lg"
    autoclose={false}
    class="w-full">
    <form on:submit|preventDefault={handleCreateItem} class="space-y-6">
      <h3 class="text-xl font-medium text-gray-900 dark:text-white flex items-center gap-2">
        <Plus class="w-5 h-5" />
        Create New Vocabulary Item
      </h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="create-source" class="mb-2">Source Text *</Label>
          <Input id="create-source" bind:value={createForm.sourceText} required />
        </div>
        <div>
          <Label for="create-target" class="mb-2">Target Text *</Label>
          <Input id="create-target" bind:value={createForm.targetText} required />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="create-source-lang" class="mb-2">Source Language *</Label>
          <Select id="create-source-lang" bind:value={createForm.sourceLanguage} required>
            <option value="en">English</option>
            <option value="de">German</option>
            <option value="es">Spanish</option>
            <option value="ru">Russian</option>
          </Select>
        </div>
        <div>
          <Label for="create-target-lang" class="mb-2">Target Language *</Label>
          <Select id="create-target-lang" bind:value={createForm.targetLanguage} required>
            <option value="en">English</option>
            <option value="de">German</option>
            <option value="es">Spanish</option>
            <option value="ru">Russian</option>
          </Select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="create-list" class="mb-2">List Name *</Label>
          <Input id="create-list" bind:value={createForm.listName} required />
        </div>
        <div>
          <Label for="create-level" class="mb-2">Difficulty Level *</Label>
          <Select id="create-level" bind:value={createForm.difficultyLevel} required>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
            <option value="C2">C2</option>
          </Select>
        </div>
      </div>
      <div>
        <Label for="create-source-example" class="mb-2">Source Example (optional)</Label>
        <Textarea
          id="create-source-example"
          rows="2"
          bind:value={createForm.sourceUsageExample}
          placeholder="Example sentence in source language" />
      </div>
      <div>
        <Label for="create-target-example" class="mb-2">Target Example (optional)</Label>
        <Textarea
          id="create-target-example"
          rows="2"
          bind:value={createForm.targetUsageExample}
          placeholder="Example sentence in target language" />
      </div>
      <div class="flex justify-end gap-2">
        <Button color="alternative" on:click={closeCreateModal} disabled={loading}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Item'}</Button>
      </div>
    </form>
  </Modal>

  <!-- Toast Notification -->
  <Toast
    bind:open={showToast}
    color={toastType === 'success' ? 'green' : toastType === 'error' ? 'red' : 'blue'}
    position="bottom-right"
    class="fixed bottom-4 right-4 z-50">
    <svelte:fragment slot="icon">
      {#if toastType === 'success'}
        <CheckCircle class="w-5 h-5" />
      {:else if toastType === 'error'}
        <XCircle class="w-5 h-5" />
      {:else}
        <Info class="w-5 h-5" />
      {/if}
    </svelte:fragment>
    {toastMessage}
  </Toast>
</div>

<style>
  * {
    box-sizing: border-box;
  }

  .admin-wrapper {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
  }

  .admin-header {
    background: white;
    border-radius: 16px;
    padding: 24px 32px;
    margin-bottom: 24px;
    box-shadow: 0 4px 6px rgb(0 0 0 / 10%);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
  }

  .header-title h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: #1a202c;
  }

  .subtitle {
    margin: 4px 0 0;
    color: #718096;
    font-size: 14px;
  }

  .header-stats {
    display: flex;
    gap: 16px;
  }

  .stat-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    text-align: center;
    min-width: 100px;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
  }

  .stat-label {
    font-size: 12px;
    opacity: 0.9;
    margin-top: 2px;
  }

  .admin-main {
    background: white;
    border-radius: 16px;
    padding: 32px;
    box-shadow: 0 4px 6px rgb(0 0 0 / 10%);
    min-height: 500px;
  }

  .search-section {
    margin-bottom: 32px;
  }

  .empty-state {
    text-align: center;
    padding: 80px 20px;
    color: #718096;
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .empty-state h3 {
    margin: 0 0 8px;
    color: #2d3748;
    font-size: 20px;
  }

  .empty-state p {
    margin: 0 0 16px;
    font-size: 15px;
  }

  .keyboard-hint {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    font-size: 14px;
    color: #4a5568;
  }

  kbd {
    background: #e2e8f0;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 2px 0 #cbd5e0;
  }

  .loading-skeleton {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  .skeleton-card {
    height: 200px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 12px;
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }

    100% {
      background-position: -200% 0;
    }
  }

  @media (width <= 768px) {
    .admin-wrapper {
      padding: 12px;
    }

    .admin-header {
      padding: 20px;
    }

    .header-content {
      flex-direction: column;
      align-items: flex-start;
    }

    .admin-main {
      padding: 20px;
    }
  }
</style>
