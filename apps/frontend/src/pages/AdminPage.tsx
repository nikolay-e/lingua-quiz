import { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuthStore } from '@features/auth/stores/auth.store';
import adminApi, { type VocabularyItemCreate, type VocabularyItemUpdate } from '@api/admin';
import { LANGUAGE_OPTIONS, DIFFICULTY_OPTIONS, LIST_NAME_OPTIONS } from '@features/admin/config/adminConfig';
import type { AdminVocabularyItem } from '@api/types';
import { Button, Input, Label, Select, Card, CardContent } from '@shared/ui';
import { ConfirmDialog, PageContainer, useToast } from '@shared/components';
import { cn, extractErrorMessage } from '@shared/utils';

interface EditForm {
  sourceText: string;
  targetText: string;
  sourceUsageExample: string | null;
  targetUsageExample: string | null;
  listName: string;
  difficultyLevel?: string;
}

interface CreateForm {
  sourceText: string;
  targetText: string;
  sourceLanguage: string;
  targetLanguage: string;
  listName: string;
  difficultyLevel?: string;
  sourceUsageExample: string | null;
  targetUsageExample: string | null;
}

const initialCreateForm: CreateForm = {
  sourceText: '',
  sourceLanguage: 'en',
  targetText: '',
  targetLanguage: 'ru',
  listName: '',
  difficultyLevel: 'A1',
  sourceUsageExample: '',
  targetUsageExample: '',
};

export function AdminPage(): React.JSX.Element {
  const toast = useToast();
  const token = useAuthStore((state) => state.token);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AdminVocabularyItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AdminVocabularyItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AdminVocabularyItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [editForm, setEditForm] = useState<EditForm>({
    sourceText: '',
    targetText: '',
    sourceUsageExample: '',
    targetUsageExample: '',
    listName: '',
    difficultyLevel: '',
  });

  const [createForm, setCreateForm] = useState<CreateForm>(initialCreateForm);

  const [filterLanguage, setFilterLanguage] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'source' | 'target' | 'list'>('source');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredResults = useMemo(() => {
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
  }, [searchResults, filterLanguage, filterStatus, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = searchResults.length;
    const active = searchResults.filter((item) => item.isActive).length;
    const inactive = total - active;
    const languages = new Set(searchResults.flatMap((item) => [item.sourceLanguage, item.targetLanguage]));
    return { total, active, inactive, languageCount: languages.size };
  }, [searchResults]);

  const handleSearch = async () => {
    if (token === null || searchQuery.trim() === '') {
      toast.error('Please enter a search query');
      return;
    }

    setSearchLoading(true);

    try {
      const results = await adminApi.searchVocabulary(token, searchQuery);
      setSearchResults(results);
      toast.success(`Found ${results.length} items`);
    } catch (error: unknown) {
      const message = extractErrorMessage(error, 'Search failed');
      toast.error(message);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const openEditDialog = (item: AdminVocabularyItem) => {
    setSelectedItem(item);
    setEditForm({
      sourceText: item.sourceText,
      targetText: item.targetText,
      sourceUsageExample: item.sourceUsageExample ?? '',
      targetUsageExample: item.targetUsageExample ?? '',
      listName: item.listName,
      difficultyLevel: item.difficultyLevel ?? '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateItem = async () => {
    if (token === null || selectedItem === null) return;

    setLoading(true);

    try {
      const updates: VocabularyItemUpdate = {};

      if (editForm.sourceText !== selectedItem.sourceText) updates.sourceText = editForm.sourceText;
      if (editForm.targetText !== selectedItem.targetText) updates.targetText = editForm.targetText;
      if (editForm.sourceUsageExample !== (selectedItem.sourceUsageExample ?? '')) {
        updates.sourceUsageExample = editForm.sourceUsageExample ?? null;
      }
      if (editForm.targetUsageExample !== (selectedItem.targetUsageExample ?? '')) {
        updates.targetUsageExample = editForm.targetUsageExample ?? null;
      }
      if (editForm.listName !== selectedItem.listName) updates.listName = editForm.listName;
      if (editForm.difficultyLevel !== undefined && editForm.difficultyLevel !== (selectedItem.difficultyLevel ?? '')) {
        updates.difficultyLevel = editForm.difficultyLevel;
      }

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save');
        setIsEditDialogOpen(false);
        return;
      }

      await adminApi.updateVocabularyItem(token, selectedItem.id, updates);
      const index = searchResults.findIndex((item) => item.id === selectedItem.id);
      if (index !== -1) {
        const updatedResults = [...searchResults];
        updatedResults[index] = { ...searchResults[index], ...editForm } as AdminVocabularyItem;
        setSearchResults(updatedResults);
      }

      toast.success('Item updated successfully');
      setIsEditDialogOpen(false);
    } catch (error: unknown) {
      const message = extractErrorMessage(error, 'Update failed');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setCreateForm(initialCreateForm);
    setIsCreateDialogOpen(true);
  };

  const handleCreateItem = async () => {
    if (token === null) return;

    setLoading(true);

    try {
      const payload: VocabularyItemCreate = {
        sourceText: createForm.sourceText,
        sourceLanguage: createForm.sourceLanguage,
        targetText: createForm.targetText,
        targetLanguage: createForm.targetLanguage,
        listName: createForm.listName,
        difficultyLevel: createForm.difficultyLevel,
        sourceUsageExample: createForm.sourceUsageExample ?? null,
        targetUsageExample: createForm.targetUsageExample ?? null,
      };

      await adminApi.createVocabularyItem(token, payload);
      toast.success('Item created successfully');
      setIsCreateDialogOpen(false);
    } catch (error: unknown) {
      const message = extractErrorMessage(error, 'Create failed');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (item: AdminVocabularyItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteItem = async () => {
    if (token === null || itemToDelete === null) return;

    setLoading(true);
    const deletedItemId = itemToDelete.id;

    try {
      await adminApi.deleteVocabularyItem(token, deletedItemId);
      setSearchResults(searchResults.filter((item) => item.id !== deletedItemId));
      toast.success('Item deleted successfully');
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error: unknown) {
      const message = extractErrorMessage(error, 'Delete failed');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (column: 'source' | 'target' | 'list') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const languageFilterOptions = [{ value: 'all', label: 'All Languages' }, ...LANGUAGE_OPTIONS];
  const statusFilterOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  return (
    <>
      <PageContainer maxWidth="4xl">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Vocabulary Management</h1>
            <p className="text-muted-foreground">Search, create, and manage vocabulary items</p>
          </div>
          <Button onClick={openCreateDialog} className="w-full md:w-auto">
            <Plus size={20} className="mr-2" />
            Create New Item
          </Button>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-success">{stats.active}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive">{stats.inactive}</div>
              <div className="text-sm text-muted-foreground">Inactive</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{stats.languageCount}</div>
              <div className="text-sm text-muted-foreground">Languages</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search vocabulary..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSearch();
              }}
            />
            <Button
              onClick={() => {
                void handleSearch();
              }}
              disabled={searchLoading}
            >
              {searchLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span className="ml-2">Search</span>
            </Button>
          </div>
          <div className="flex gap-2">
            <Select
              value={filterLanguage}
              onValueChange={setFilterLanguage}
              options={languageFilterOptions}
              className="w-40"
            />
            <Select
              value={filterStatus}
              onValueChange={setFilterStatus}
              options={statusFilterOptions}
              className="w-32"
            />
          </div>
        </div>

        {filteredResults.length > 0 && (
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th
                    className="text-left p-3 cursor-pointer"
                    onClick={() => {
                      toggleSort('source');
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Source
                      {sortBy === 'source' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th
                    className="text-left p-3 cursor-pointer"
                    onClick={() => {
                      toggleSort('target');
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Target
                      {sortBy === 'target' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th
                    className="text-left p-3 cursor-pointer"
                    onClick={() => {
                      toggleSort('list');
                    }}
                  >
                    <div className="flex items-center gap-1">
                      List
                      {sortBy === 'list' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                    <td className="p-3">{item.sourceText}</td>
                    <td className="p-3">{item.targetText}</td>
                    <td className="p-3">{item.listName}</td>
                    <td className="p-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs',
                          item.isActive ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive',
                        )}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            openEditDialog(item);
                          }}
                          aria-label={`Edit ${item.sourceText}`}
                        >
                          <Edit2 size={16} aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            openDeleteDialog(item);
                          }}
                          aria-label={`Delete ${item.sourceText}`}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </PageContainer>

      {isEditDialogOpen && selectedItem !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Edit Vocabulary Item</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <Label>Source Text</Label>
                  <Input
                    value={editForm.sourceText}
                    onChange={(e) => {
                      setEditForm({ ...editForm, sourceText: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label>Target Text</Label>
                  <Input
                    value={editForm.targetText}
                    onChange={(e) => {
                      setEditForm({ ...editForm, targetText: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label>Source Example</Label>
                  <Input
                    value={editForm.sourceUsageExample ?? ''}
                    onChange={(e) => {
                      setEditForm({ ...editForm, sourceUsageExample: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label>Target Example</Label>
                  <Input
                    value={editForm.targetUsageExample ?? ''}
                    onChange={(e) => {
                      setEditForm({ ...editForm, targetUsageExample: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label>List Name</Label>
                  <Select
                    value={editForm.listName}
                    onValueChange={(val) => {
                      setEditForm({ ...editForm, listName: val });
                    }}
                    options={LIST_NAME_OPTIONS}
                  />
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={editForm.difficultyLevel}
                    onValueChange={(val) => {
                      setEditForm({ ...editForm, difficultyLevel: val });
                    }}
                    options={DIFFICULTY_OPTIONS}
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      void handleUpdateItem();
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
        </div>
      )}

      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Create Vocabulary Item</h2>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Source Language</Label>
                    <Select
                      value={createForm.sourceLanguage}
                      onValueChange={(val) => {
                        setCreateForm({ ...createForm, sourceLanguage: val });
                      }}
                      options={LANGUAGE_OPTIONS}
                    />
                  </div>
                  <div>
                    <Label>Target Language</Label>
                    <Select
                      value={createForm.targetLanguage}
                      onValueChange={(val) => {
                        setCreateForm({ ...createForm, targetLanguage: val });
                      }}
                      options={LANGUAGE_OPTIONS}
                    />
                  </div>
                </div>
                <div>
                  <Label>Source Text</Label>
                  <Input
                    value={createForm.sourceText}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, sourceText: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label>Target Text</Label>
                  <Input
                    value={createForm.targetText}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, targetText: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label>Source Example</Label>
                  <Input
                    value={createForm.sourceUsageExample ?? ''}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, sourceUsageExample: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label>Target Example</Label>
                  <Input
                    value={createForm.targetUsageExample ?? ''}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, targetUsageExample: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label>List Name</Label>
                  <Select
                    value={createForm.listName}
                    onValueChange={(val) => {
                      setCreateForm({ ...createForm, listName: val });
                    }}
                    options={LIST_NAME_OPTIONS}
                  />
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={createForm.difficultyLevel}
                    onValueChange={(val) => {
                      setCreateForm({ ...createForm, difficultyLevel: val });
                    }}
                    options={DIFFICULTY_OPTIONS}
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      void handleCreateItem();
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
        </div>
      )}

      {isDeleteDialogOpen && itemToDelete !== null && (
        <ConfirmDialog
          open={isDeleteDialogOpen}
          title="Delete Vocabulary Item"
          description={`Are you sure you want to delete "${itemToDelete.sourceText}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            void handleDeleteItem();
          }}
          onCancel={() => {
            setIsDeleteDialogOpen(false);
          }}
        />
      )}
    </>
  );
}
