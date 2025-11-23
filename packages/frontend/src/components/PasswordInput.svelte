<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';

  export let value: string;
  export let placeholder: string = '';
  export let disabled: boolean = false;
  export let id: string = 'password';
  export let label: string = '';
  export let autocomplete: 'current-password' | 'new-password' = 'current-password';

  let showPassword = false;

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
    {disabled}
    {id}
    {autocomplete}
  />
  <button
    type="button"
    class="toggle-password-btn"
    onclick={togglePasswordVisibility}
    aria-label={showPassword ? 'Hide password' : 'Show password'}
  >
    <i class="fas fa-eye{showPassword ? '-slash' : ''}"></i>
  </button>
</div>
