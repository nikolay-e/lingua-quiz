<script lang="ts">
  import { tick } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
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

  export async function focus() {
    await tick();
    inputElement?.focus();
  }
</script>

<form class="flex flex-col gap-3" onsubmit={handleFormSubmit}>
  <label for="answer-input" class="sr-only">Your answer</label>
  <Input
    id="answer-input"
    type="text"
    bind:ref={inputElement}
    {value}
    oninput={(e) => onValueChange(e.currentTarget.value)}
    placeholder="Type your answer..."
    disabled={disabled || isLoading}
    aria-describedby="word"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    spellcheck={false}
  />
  <div class="flex flex-row gap-3">
    <Button
      type="button"
      variant="outline"
      onclick={onSkip}
      disabled={!onSkip || isLoading}
      class="flex-1"
    >
      <Eye size={16} />
      <span>Show Answer</span>
    </Button>
    <Button
      type="submit"
      variant="default"
      disabled={disabled || isLoading}
      class="flex-1"
    >
      {#if isLoading}
        <Loader2 size={16} class="animate-spin" />
        <span>Checking...</span>
      {:else}
        <Send size={16} />
        <span>Check Answer</span>
      {/if}
    </Button>
  </div>
</form>
