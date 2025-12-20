<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Eye, EyeOff } from 'lucide-svelte';

  interface Props {
    value: string;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    label?: string;
    autocomplete?: 'current-password' | 'new-password';
    invalid?: boolean;
  }

  /* eslint-disable prefer-const */
  let {
    value = $bindable(''),
    placeholder = '',
    disabled = false,
    id = 'password',
    label = '',
    autocomplete = 'current-password',
    invalid = false,
  }: Props = $props();
  /* eslint-enable prefer-const */

  let showPassword = $state(false);

  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }
</script>

<div class="input-group">
  {#if label}
    <Label for={id}>{label}</Label>
  {/if}
  <Input
    type={showPassword ? 'text' : 'password'}
    bind:value
    {placeholder}
    required
    aria-required="true"
    aria-invalid={invalid}
    {disabled}
    {id}
    {autocomplete}
  />
  <button
    type="button"
    class="toggle-password-btn disabled:opacity-50 disabled:cursor-not-allowed"
    onclick={togglePasswordVisibility}
    aria-label={showPassword ? 'Hide password' : 'Show password'}
    tabindex="-1"
    {disabled}
  >
    {#if showPassword}
      <EyeOff size={16} />
    {:else}
      <Eye size={16} />
    {/if}
  </button>
</div>
