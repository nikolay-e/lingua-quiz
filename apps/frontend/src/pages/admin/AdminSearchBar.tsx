import { Loader2, Search } from 'lucide-react';
import { Button, Input, Select } from '@shared/ui';
import { LANGUAGE_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from './useAdminPage';

interface AdminSearchBarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  searchLoading: boolean;
  filterLanguage: string;
  onFilterLanguageChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
}

export function AdminSearchBar({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  searchLoading,
  filterLanguage,
  onFilterLanguageChange,
  filterStatus,
  onFilterStatusChange,
}: AdminSearchBarProps): React.JSX.Element {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1 flex gap-2">
        <Input
          placeholder="Search vocabulary..."
          value={searchQuery}
          onChange={(e) => {
            onSearchQueryChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch();
          }}
        />
        <Button
          onClick={() => {
            onSearch();
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
          onValueChange={onFilterLanguageChange}
          options={LANGUAGE_FILTER_OPTIONS}
          className="w-40"
        />
        <Select
          value={filterStatus}
          onValueChange={onFilterStatusChange}
          options={STATUS_FILTER_OPTIONS}
          className="w-32"
        />
      </div>
    </div>
  );
}
