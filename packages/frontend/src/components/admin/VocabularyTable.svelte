<script lang="ts">
  import type { AdminVocabularyItem } from '../../api-types';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import * as Table from '$lib/components/ui/table';

  type SortColumn = 'source' | 'target' | 'list';

  interface Props {
    items: AdminVocabularyItem[];
    sortBy: string;
    sortOrder: string;
    onEdit?: (item: AdminVocabularyItem) => void;
    onDelete?: (item: AdminVocabularyItem) => void;
    onSort?: (column: SortColumn) => void;
  }

  const { items, sortBy, sortOrder, onEdit, onDelete, onSort }: Props = $props();

  function getSortIcon(column: SortColumn): string {
    if (sortBy !== column) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  }
</script>

{#if items.length > 0}
  <Card.Root>
    <Card.Header class="p-4">
      <Card.Title>Search Results</Card.Title>
    </Card.Header>
    <Card.Content class="p-4 pt-0">
      <div class="overflow-x-auto">
        <Table.Root data-admin-table>
          <Table.Header>
            <Table.Row>
              <Table.Head class="cursor-pointer hover:text-primary" onclick={() => onSort?.('source')}>
                Source Text {getSortIcon('source')}
              </Table.Head>
              <Table.Head class="cursor-pointer hover:text-primary" onclick={() => onSort?.('target')}>
                Target Text {getSortIcon('target')}
              </Table.Head>
              <Table.Head class="cursor-pointer hover:text-primary" onclick={() => onSort?.('list')}>
                List Name {getSortIcon('list')}
              </Table.Head>
              <Table.Head>Languages</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head class="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each items as item (item.id)}
              <Table.Row class={item.isActive ? '' : 'opacity-50'}>
                <Table.Cell class="max-w-xs truncate font-medium" data-label="Source">{item.sourceText}</Table.Cell>
                <Table.Cell class="max-w-xs truncate" data-label="Target">{item.targetText}</Table.Cell>
                <Table.Cell data-label="List">
                  <Badge variant="outline">{item.listName}</Badge>
                </Table.Cell>
                <Table.Cell data-label="Languages">
                  <div class="flex gap-1">
                    <Badge variant="secondary" class="text-xs">{item.sourceLanguage.toUpperCase()}</Badge>
                    <span class="text-muted-foreground">→</span>
                    <Badge variant="secondary" class="text-xs">{item.targetLanguage.toUpperCase()}</Badge>
                  </div>
                </Table.Cell>
                <Table.Cell data-label="Status">
                  {#if item.isActive}
                    <Badge class="bg-success text-white">Active</Badge>
                  {:else}
                    <Badge variant="destructive">Inactive</Badge>
                  {/if}
                </Table.Cell>
                <Table.Cell class="text-right" data-label="Actions">
                  <div class="flex justify-end gap-1">
                    <Button variant="outline" size="sm" onclick={() => onEdit?.(item)}>
                      <svg
                        class="mr-1 size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /><!-- eslint-disable-line max-len -->
                      </svg>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onclick={() => onDelete?.(item)}>
                      <svg
                        class="mr-1 size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true">
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
{:else}
  <Card.Root>
    <Card.Header class="p-4">
      <Card.Title>Search Results</Card.Title>
    </Card.Header>
    <Card.Content class="p-4 pt-0">
      <p class="text-muted-foreground">No results found</p>
    </Card.Content>
  </Card.Root>
{/if}
