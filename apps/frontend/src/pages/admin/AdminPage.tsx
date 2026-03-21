import { Plus } from 'lucide-react';
import { Button, Card, CardContent } from '@shared/ui';
import { AppShell } from '@shared/components';
import { useAdminPage } from './useAdminPage';
import { AdminSearchBar } from './AdminSearchBar';
import { AdminResultsTable } from './AdminResultsTable';
import { AdminEditDialog } from './AdminEditDialog';
import { AdminCreateDialog } from './AdminCreateDialog';
import { AdminDeleteDialog } from './AdminDeleteDialog';

export function AdminPage(): React.JSX.Element {
  const admin = useAdminPage();

  return (
    <>
      <AppShell maxWidth="4xl">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-primary">Vocabulary Management</h1>
            <p className="text-muted-foreground">Search, create, and manage vocabulary items</p>
          </div>
          <Button onClick={admin.openCreateDialog} className="w-full md:w-auto">
            <Plus size={20} className="mr-2" />
            Create New Item
          </Button>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{admin.stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-success">{admin.stats.active}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive">{admin.stats.inactive}</div>
              <div className="text-sm text-muted-foreground">Inactive</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{admin.stats.languageCount}</div>
              <div className="text-sm text-muted-foreground">Languages</div>
            </CardContent>
          </Card>
        </div>

        <AdminSearchBar
          searchQuery={admin.searchQuery}
          onSearchQueryChange={admin.setSearchQuery}
          onSearch={admin.handleSearch}
          searchLoading={admin.searchLoading}
          filterLanguage={admin.filterLanguage}
          onFilterLanguageChange={admin.setFilterLanguage}
          filterStatus={admin.filterStatus}
          onFilterStatusChange={admin.setFilterStatus}
        />

        <AdminResultsTable
          searchResults={admin.searchResults}
          filteredResults={admin.filteredResults}
          sortBy={admin.sortBy}
          sortOrder={admin.sortOrder}
          onToggleSort={admin.toggleSort}
          onEdit={admin.openEditDialog}
          onDelete={admin.openDeleteDialog}
        />
      </AppShell>

      <AdminEditDialog
        open={admin.isEditDialogOpen}
        onClose={() => {
          admin.setIsEditDialogOpen(false);
        }}
        editForm={admin.editForm}
        onEditFormChange={admin.setEditForm}
        onSave={admin.handleUpdateItem}
        loading={admin.loading}
      />

      <AdminCreateDialog
        open={admin.isCreateDialogOpen}
        onClose={() => {
          admin.setIsCreateDialogOpen(false);
        }}
        createForm={admin.createForm}
        onCreateFormChange={admin.setCreateForm}
        onCreate={admin.handleCreateItem}
        loading={admin.loading}
      />

      <AdminDeleteDialog
        open={admin.isDeleteDialogOpen}
        item={admin.itemToDelete}
        onConfirm={admin.handleDeleteItem}
        onCancel={() => {
          admin.setIsDeleteDialogOpen(false);
        }}
      />
    </>
  );
}
