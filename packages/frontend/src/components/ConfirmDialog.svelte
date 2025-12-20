<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { AlertTriangle } from 'lucide-svelte';
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

  let dialogRef = $state<HTMLDialogElement | null>(null);
  let confirmButtonRef = $state<HTMLButtonElement | null>(null);
  const IconComponent = $derived(icon ?? AlertTriangle);

  $effect(() => {
    if (!dialogRef) return;

    if (open) {
      dialogRef.showModal();
      confirmButtonRef?.focus();
    } else {
      dialogRef.close();
    }
  });

  function handleCancel(e: Event) {
    e.preventDefault();
    oncancel();
  }

  function handleClick(e: MouseEvent) {
    if (e.target === dialogRef) {
      oncancel();
    }
  }
</script>

<dialog
  bind:this={dialogRef}
  class="confirm-dialog"
  aria-labelledby={titleId}
  aria-describedby={descId}
  oncancel={handleCancel}
  onclick={handleClick}
>
  <div class="confirm-dialog-content">
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
</dialog>

<style>
  .confirm-dialog {
    border: none;
    border-radius: var(--radius-lg);
    padding: 0;
    max-width: min(90vw, 400px);
    background: transparent;
  }

  .confirm-dialog::backdrop {
    background: rgb(0 0 0 / 0.5);
    backdrop-filter: blur(4px);
  }

  .confirm-dialog[open] {
    animation: dialog-appear 0.2s ease-out;
  }

  @keyframes dialog-appear {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .confirm-dialog-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-lg);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    text-align: center;
    box-shadow: var(--shadow-xl);
  }

  .confirm-dialog :global(.warning-icon) {
    color: var(--color-secondary);
  }

  .confirm-title {
    font-weight: var(--font-weight-semibold);
  }

  .confirm-desc {
    color: var(--color-text-muted);
  }

  .confirm-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-sm);
  }

  @media (prefers-reduced-motion: reduce) {
    .confirm-dialog[open] {
      animation: none;
    }
  }
</style>
