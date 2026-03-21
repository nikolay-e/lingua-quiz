import { useState, useMemo } from 'react';
import { useAuthStore } from '@features/auth/stores/auth.store';
import adminApi, { type VocabularyItemCreate, type VocabularyItemUpdate } from '@api/admin';
import { LANGUAGE_OPTIONS } from '@features/admin/config/adminConfig';
import type { AdminVocabularyItem } from '@api/types';
import { useToast } from '@shared/components';
import { extractErrorMessage } from '@shared/utils';
import type { EditForm, CreateForm } from './types';

const LANGUAGE_FILTER_OPTIONS = [{ value: 'all', label: 'All Languages' }, ...LANGUAGE_OPTIONS];
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

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

export { LANGUAGE_FILTER_OPTIONS, STATUS_FILTER_OPTIONS };

export function useAdminPage() {
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
      switch (sortBy) {
        case 'source':
          comparison = a.sourceText.localeCompare(b.sourceText);
          break;
        case 'target':
          comparison = a.targetText.localeCompare(b.targetText);
          break;
        case 'list':
          comparison = a.listName.localeCompare(b.listName);
          break;
      }
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

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    filteredResults,
    stats,
    searchLoading,
    loading,

    filterLanguage,
    setFilterLanguage,
    filterStatus,
    setFilterStatus,
    sortBy,
    sortOrder,
    toggleSort,

    handleSearch,

    isEditDialogOpen,
    setIsEditDialogOpen,
    editForm,
    setEditForm,
    openEditDialog,
    handleUpdateItem,

    isCreateDialogOpen,
    setIsCreateDialogOpen,
    createForm,
    setCreateForm,
    openCreateDialog,
    handleCreateItem,

    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    itemToDelete,
    openDeleteDialog,
    handleDeleteItem,
  };
}
