<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';

  interface Props {
    children: import('svelte').Snippet;
  }

  const { children }: Props = $props();

  let hasError = $state(false);
  let errorMessage = $state('');

  function handleError(event: ErrorEvent) {
    hasError = true;
    errorMessage = event.message || 'An unexpected error occurred';
    event.preventDefault();
  }

  function handleRejection(event: PromiseRejectionEvent) {
    hasError = true;
    errorMessage = event.reason?.message || 'An unexpected error occurred';
    event.preventDefault();
  }

  function retry() {
    hasError = false;
    errorMessage = '';
    window.location.reload();
  }

  onMount(() => {
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  });
</script>

{#if hasError}
  <div class="error-boundary">
    <div class="error-content">
      <div class="error-icon">⚠️</div>
      <h2>Something went wrong</h2>
      <p class="error-message">{errorMessage}</p>
      <Button onclick={retry} variant="default">
        <i class="fas fa-redo"></i> Reload Page
      </Button>
    </div>
  </div>
{:else}
  {@render children()}
{/if}

<style>
  .error-boundary {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    padding: var(--spacing-xl);
  }

  .error-content {
    text-align: center;
    max-width: 400px;
  }

  .error-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md);
  }

  h2 {
    margin: 0 0 var(--spacing-sm);
    color: var(--color-destructive);
  }

  .error-message {
    color: var(--color-text-muted);
    margin-bottom: var(--spacing-lg);
    font-size: var(--font-size-sm);
  }
</style>
