<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string | null;
    subtitle?: string | null;
    dense?: boolean;
    class?: string;
    headerAction?: Snippet;
    children?: Snippet;
  }

  const {
    title = null,
    subtitle = null,
    dense = false,
    class: className,
    headerAction,
    children,
  }: Props = $props();
</script>

<article
  class={cn(
    'bg-card border border-border rounded-lg shadow-sm',
    dense ? 'p-4' : 'p-6',
    className,
  )}
>
  {#if title || subtitle || headerAction}
    <header class="mb-3">
      <div class="flex justify-between items-center gap-4">
        <div>
          {#if title}
            <h3 class="text-lg font-semibold text-foreground mb-1">{title}</h3>
          {/if}
          {#if subtitle}
            <p class="text-sm text-muted-foreground">{subtitle}</p>
          {/if}
        </div>
        {#if headerAction}
          <div class="shrink-0">
            {@render headerAction()}
          </div>
        {/if}
      </div>
    </header>
  {/if}
  <div>
    {#if children}
      {@render children()}
    {/if}
  </div>
</article>
