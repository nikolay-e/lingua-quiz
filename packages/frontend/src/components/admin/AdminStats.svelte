<script lang="ts">
  import * as Card from '$lib/components/ui/card';

  interface Stats {
    total: number;
    active: number;
    inactive: number;
    languageCount: number;
  }

  interface Props {
    stats: Stats;
  }

  const { stats }: Props = $props();
</script>

{#if stats.total > 0}
  <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
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
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0
              002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </Card.Header>
      <Card.Content class="p-4 pt-0">
        <div class="text-2xl font-bold">{stats.total}</div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
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
      <Card.Content class="p-4 pt-0">
        <div class="text-2xl font-bold text-success">{stats.active}</div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
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
      <Card.Content class="p-4 pt-0">
        <div class="text-2xl font-bold text-destructive">{stats.inactive}</div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
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
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751
              5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      </Card.Header>
      <Card.Content class="p-4 pt-0">
        <div class="text-2xl font-bold">{stats.languageCount}</div>
      </Card.Content>
    </Card.Root>
  </div>
{/if}
