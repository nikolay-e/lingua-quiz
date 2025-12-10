<script lang="ts">
  interface Props {
    message: string;
    variant?: 'success' | 'error' | null;
    id?: string;
  }

  const { message, variant = null, id = 'auth-message' }: Props = $props();

  function getMessageColor(v: 'success' | 'error' | null): string {
    if (v === 'success') return 'var(--success-color)';
    if (v === 'error') return 'var(--error-color)';
    return 'inherit';
  }

  const messageColor = $derived(getMessageColor(variant));
</script>

{#if message}
  <p
    {id}
    class="text-center {variant === 'error' ? 'error-message' : ''}"
    style:color={messageColor}
    role={variant === 'error' ? 'alert' : 'status'}
    aria-live={variant === 'error' ? 'assertive' : 'polite'}>
    {message}
  </p>
{/if}
