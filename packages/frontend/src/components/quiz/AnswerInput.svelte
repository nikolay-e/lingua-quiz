<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Send, Eye, Loader2 } from 'lucide-svelte';

  interface Props {
    value: string;
    disabled: boolean;
    onSubmit: () => void;
    onValueChange: (value: string) => void;
    onSkip?: () => void;
    isLoading?: boolean;
  }

  const { value, disabled, onSubmit, onValueChange, onSkip, isLoading = false }: Props = $props();

  let inputElement = $state<HTMLInputElement | null>(null);

  function handleFormSubmit(e: Event) {
    e.preventDefault();
    if (!disabled && !isLoading) onSubmit();
  }

  export function focus() {
    inputElement?.focus();
  }
</script>

<form class="answer-input-container" onsubmit={handleFormSubmit}>
  <label for="answer-input" class="sr-only">Your answer</label>
  <input
    id="answer-input"
    type="text"
    bind:this={inputElement}
    {value}
    oninput={(e) => onValueChange(e.currentTarget.value)}
    placeholder="Type your answer..."
    disabled={disabled || isLoading}
    aria-describedby="word"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
  />
  <div class="button-row">
    <Button
      type="submit"
      variant="default"
      disabled={disabled || isLoading}
      class="submit-btn">
      {#if isLoading}
        <Loader2 size={16} class="animate-spin" />
        <span>Checking...</span>
      {:else}
        <Send size={16} />
        <span>Check Answer</span>
      {/if}
    </Button>
    <Button
      type="button"
      variant="outline"
      onclick={onSkip}
      disabled={!onSkip || isLoading}
      class="skip-btn">
      <Eye size={16} />
      <span>Show Answer</span>
    </Button>
  </div>
</form>

<style>
  .answer-input-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  input {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .button-row {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .button-row :global(.submit-btn),
  .button-row :global(.skip-btn) {
    width: 100%;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }
</style>
