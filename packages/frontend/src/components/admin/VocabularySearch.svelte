<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Card from '$lib/components/ui/card';
  import * as Select from '$lib/components/ui/select';
  import { Label } from '$lib/components/ui/label';
  import { Separator } from '$lib/components/ui/separator';

  type LanguageOption = { value: string; label: string };
  type SortByOption = 'source' | 'target' | 'list';
  type SortOrderOption = 'asc' | 'desc';

  interface Props {
    searchQuery: string;
    filterLanguage: string;
    filterStatus: string;
    sortBy: SortByOption;
    sortOrder: SortOrderOption;
    searchLoading: boolean;
    languageOptions: LanguageOption[];
    listNameOptions?: LanguageOption[];
    showFilters?: boolean;
    resultCount?: number;
    totalCount?: number;
    onsearch?: () => void;
  }

  /* eslint-disable prefer-const */
  let {
    searchQuery = $bindable(),
    filterLanguage = $bindable(),
    filterStatus = $bindable(),
    sortBy = $bindable(),
    sortOrder = $bindable(),
    searchLoading,
    languageOptions,
    showFilters = false,
    resultCount = 0,
    totalCount = 0,
    onsearch,
  }: Props = $props();
  /* eslint-enable prefer-const */

  function handleSearchClick() {
    if (onsearch && searchQuery.trim()) {
      onsearch();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  }
</script>

<Card.Root>
  <Card.Header style="padding: var(--spacing-md);">
    <Card.Title>Search Vocabulary</Card.Title>
    <Card.Description>Search by source or target text using full-text search</Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4" style="padding: var(--spacing-md); padding-block-start: 0;">
    <div class="flex flex-col md:flex-row" style="gap: var(--spacing-md);">
      <div class="relative flex-1">
        <Input
          type="text"
          placeholder="Enter search term..."
          bind:value={searchQuery}
          onkeydown={handleKeyDown}
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
      <Button onclick={handleSearchClick} disabled={searchLoading || !searchQuery.trim()} class="md:w-32">
        {searchLoading ? 'Searching...' : 'Search'}
      </Button>
    </div>

    {#if showFilters}
      <Separator />
      <div class="flex flex-col md:flex-row md:items-center" style="gap: var(--spacing-md);">
        <div class="flex items-center" style="gap: var(--spacing-xs);">
          <Label class="text-sm font-medium">Language:</Label>
          <Select.Root type="single" bind:value={filterLanguage}>
            <Select.Trigger class="w-40">
              {filterLanguage === 'all'
                ? 'All Languages'
                : languageOptions.find((l: LanguageOption) => l.value === filterLanguage)?.label ||
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

        <div class="flex items-center" style="gap: var(--spacing-xs);">
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

        <div class="flex items-center" style="gap: var(--spacing-xs);">
          <Label class="text-sm font-medium">Sort by:</Label>
          <Select.Root type="single" bind:value={sortBy}>
            <Select.Trigger class="w-32">
              {#if sortBy === 'source'}
                Source
              {:else if sortBy === 'target'}
                Target
              {:else}
                List
              {/if}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="source">Source</Select.Item>
              <Select.Item value="target">Target</Select.Item>
              <Select.Item value="list">List</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <div class="flex items-center" style="gap: var(--spacing-xs);">
          <Label class="text-sm font-medium">Order:</Label>
          <Select.Root type="single" bind:value={sortOrder}>
            <Select.Trigger class="w-32">
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="asc">Ascending</Select.Item>
              <Select.Item value="desc">Descending</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        {#if totalCount > 0}
          <div class="ml-auto text-sm text-muted-foreground">
            Showing {resultCount} of {totalCount} items
          </div>
        {/if}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
