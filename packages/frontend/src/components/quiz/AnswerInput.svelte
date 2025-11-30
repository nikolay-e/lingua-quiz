<script lang="ts">
  import { Button } from '$lib/components/ui/button';

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
  <input
    type="text"
    bind:this={inputElement}
    {value}
    oninput={(e) => onValueChange(e.currentTarget.value)}
    onkeydown={handleKeydown}
    placeholder="Type your answer…"
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
    <i class="fas fa-paper-plane"></i>
    {disabled ? 'Submitting…' : 'Submit'}
  </Button>
</div>
