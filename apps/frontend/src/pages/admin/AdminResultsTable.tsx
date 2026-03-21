import { Edit2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { AdminVocabularyItem } from '@api/types';
import { Button, Card, CardContent } from '@shared/ui';
import { cn } from '@shared/utils';

interface AdminResultsTableProps {
  searchResults: AdminVocabularyItem[];
  filteredResults: AdminVocabularyItem[];
  sortBy: 'source' | 'target' | 'list';
  sortOrder: 'asc' | 'desc';
  onToggleSort: (column: 'source' | 'target' | 'list') => void;
  onEdit: (item: AdminVocabularyItem) => void;
  onDelete: (item: AdminVocabularyItem) => void;
}

function SortIndicator({ active, order }: { active: boolean; order: 'asc' | 'desc' }): React.JSX.Element | null {
  if (!active) return null;
  return order === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
}

export function AdminResultsTable({
  searchResults,
  filteredResults,
  sortBy,
  sortOrder,
  onToggleSort,
  onEdit,
  onDelete,
}: AdminResultsTableProps): React.JSX.Element | null {
  if (searchResults.length > 0 && filteredResults.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No items match the current filters.
        </CardContent>
      </Card>
    );
  }

  if (filteredResults.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <table data-admin-table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th
              className="text-left p-3 cursor-pointer"
              onClick={() => {
                onToggleSort('source');
              }}
            >
              <div className="flex items-center gap-1">
                Source
                <SortIndicator active={sortBy === 'source'} order={sortOrder} />
              </div>
            </th>
            <th
              className="text-left p-3 cursor-pointer"
              onClick={() => {
                onToggleSort('target');
              }}
            >
              <div className="flex items-center gap-1">
                Target
                <SortIndicator active={sortBy === 'target'} order={sortOrder} />
              </div>
            </th>
            <th
              className="text-left p-3 cursor-pointer"
              onClick={() => {
                onToggleSort('list');
              }}
            >
              <div className="flex items-center gap-1">
                List
                <SortIndicator active={sortBy === 'list'} order={sortOrder} />
              </div>
            </th>
            <th className="text-left p-3">Status</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredResults.map((item) => (
            <tr key={item.id} className="border-t border-border hover:bg-muted/50 transition-colors">
              <td data-label="Source" className="p-3">
                {item.sourceText}
              </td>
              <td data-label="Target" className="p-3">
                {item.targetText}
              </td>
              <td data-label="List" className="p-3">
                {item.listName}
              </td>
              <td data-label="Status" className="p-3">
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs',
                    item.isActive ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive',
                  )}
                >
                  {item.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td data-label="Actions" className="p-3 text-right">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onEdit(item);
                    }}
                    aria-label={`Edit ${item.sourceText}`}
                  >
                    <Edit2 size={16} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onDelete(item);
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
  );
}
