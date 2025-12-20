<script lang="ts">
  interface Props {
    examples?: { source: string; target: string } | null;
  }

  const { examples = null }: Props = $props();
</script>

{#if examples}
  <div class="flex flex-col gap-2">
    {#if examples.source}
      <p class="example-text">{examples.source}</p>
    {/if}
    {#if examples.target}
      <p class="example-text">{examples.target}</p>
    {/if}
  </div>
{/if}

<style>
  .example-text {
    background-color: var(--color-muted);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    margin: 0;
    font-style: italic;
  }
</style>
