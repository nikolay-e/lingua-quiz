<script lang="ts">
  import { AlertCircle, RefreshCw } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';

  interface Props {
    message: string;
    onRetry?: () => void;
    onDismiss?: () => void;
    retryLabel?: string;
  }

  const { message, onRetry, onDismiss, retryLabel = 'Try again' }: Props = $props();
</script>

<div class="error-display" role="alert">
  <div class="error-content">
    <AlertCircle size={24} class="error-icon" />
    <p class="error-message text-sm">{message}</p>
  </div>
  <div class="error-actions">
    {#if onRetry}
      <Button variant="default" size="sm" onclick={onRetry}>
        <RefreshCw size={16} />
        <span>{retryLabel}</span>
      </Button>
    {/if}
    {#if onDismiss}
      <Button variant="ghost" size="sm" onclick={onDismiss}>
        Dismiss
      </Button>
    {/if}
  </div>
</div>

<style>
  .error-display {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--color-error-bg);
    border: 1px solid var(--color-error-border);
    border-radius: var(--radius-md);
  }

  .error-content {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .error-content :global(.error-icon) {
    color: var(--color-error);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .error-message {
    margin: 0;
    color: var(--color-error-text);
    line-height: 1.5;
  }

  .error-actions {
    display: flex;
    gap: var(--spacing-sm);
    justify-content: flex-end;
  }
</style>
