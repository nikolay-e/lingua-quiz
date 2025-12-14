<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    value: number | string;
    icon: Snippet;
    colorClass?: string;
    valueColorClass?: string;
  }

  const {
    title,
    value,
    icon,
    colorClass = 'text-muted-foreground',
    valueColorClass,
  }: Props = $props();

  const actualValueColorClass = $derived(valueColorClass ?? colorClass);
</script>

<Card.Root class="stats-card">
  <Card.Header class="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
    <Card.Title class="text-sm font-medium">{title}</Card.Title>
    <span class="size-4 {colorClass}">
      {@render icon()}
    </span>
  </Card.Header>
  <Card.Content class="p-4 pt-0">
    <div class="text-2xl font-bold {actualValueColorClass}">{value}</div>
  </Card.Content>
</Card.Root>
