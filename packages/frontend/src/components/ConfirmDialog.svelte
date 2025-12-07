<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { AlertTriangle } from 'lucide-svelte';
  import { focusTrap } from '$lib/actions/focusTrap';
  import type { Component } from 'svelte';

  interface Props {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel?: string;
    confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    onconfirm: () => void;
    oncancel: () => void;
    icon?: Component<{ size?: number; class?: string }>;
    titleId?: string;
    descId?: string;
  }

  const {
    open,
    title,
    description,
    confirmLabel,
    cancelLabel = 'Cancel',
    confirmVariant = 'destructive',
    onconfirm,
    oncancel,
    icon,
    titleId = 'confirm-dialog-title',
    descId = 'confirm-dialog-desc',
  }: Props = $props();

  let confirmButtonRef = $state<HTMLButtonElement | null>(null);
  const IconComponent = $derived(icon ?? AlertTriangle);

  $effect(() => {
    if (open && confirmButtonRef) {
      confirmButtonRef.focus();
    }
  });

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      oncancel();
    }
  }
</script>

{#if open}
  <div
    use:focusTrap
    class="confirm-dialog"
    role="alertdialog"
    aria-labelledby={titleId}
    aria-describedby={descId}
    tabindex="-1"
    onkeydown={handleKeyDown}
  >
    <IconComponent size={20} class="warning-icon" />
    <span id={titleId} class="confirm-title text-base">{title}</span>
    <span id={descId} class="confirm-desc text-sm">{description}</span>
    <div class="confirm-actions">
      <Button
        bind:ref={confirmButtonRef}
        size="sm"
        variant={confirmVariant}
        onclick={onconfirm}
      >
        {confirmLabel}
      </Button>
      <Button size="sm" variant="ghost" onclick={oncancel}>
        {cancelLabel}
      </Button>
    </div>
  </div>
{/if}

<style>
  .confirm-dialog {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    background-color: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    text-align: center;
  }

  .confirm-dialog :global(.warning-icon) {
    color: var(--color-secondary);
  }

  .confirm-title {
    font-weight: 600;
  }

  .confirm-desc {
    color: var(--color-text-muted);
  }

  .confirm-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-xs);
  }
</style>
