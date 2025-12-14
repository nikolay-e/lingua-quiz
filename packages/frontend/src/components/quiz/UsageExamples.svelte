<script lang="ts">
  interface Props {
    examples?: { source: string; target: string } | null;
  }

  const { examples = null }: Props = $props();
</script>

{#if examples}
  <div class="usage-examples">
    <h3 class="examples-title">Usage Examples</h3>
    <div class="example-container">
      {#if examples.source}
        <p class="example-text">{examples.source}</p>
      {/if}
      {#if examples.target}
        <p class="example-text">{examples.target}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .usage-examples {
    padding: var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--container-bg);
  }

  .examples-title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-muted-foreground);
    margin: 0 0 var(--spacing-sm) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .example-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .example-text {
    background-color: var(--color-muted);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    margin: 0;
    font-style: italic;
  }
</style>
