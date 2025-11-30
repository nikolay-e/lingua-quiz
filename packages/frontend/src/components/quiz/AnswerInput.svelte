<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Send } from 'lucide-svelte';

  interface Props {
    value: string;
    disabled: boolean;
    onSubmit: () => void;
    onValueChange: (value: string) => void;
  }

  const { value, disabled, onSubmit, onValueChange }: Props = $props();

  let inputElement = $state<HTMLInputElement | null>(null);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !disabled) onSubmit();
  }

  export function focus() {
    inputElement?.focus();
  }
</script>

<div class="actions">
  <label for="answer-input" class="sr-only">Your answer</label>
  <input
    id="answer-input"
    type="text"
    bind:this={inputElement}
    {value}
    oninput={(e) => onValueChange(e.currentTarget.value)}
    onkeydown={handleKeydown}
    placeholder="Type your answer..."
    {disabled}
    aria-describedby="word"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
  />
  <Button
    type="button"
    variant="default"
    onclick={onSubmit}
    {disabled}>
    <Send size={16} />
    {disabled ? 'Submitting…' : 'Submit'}
  </Button>
</div>
