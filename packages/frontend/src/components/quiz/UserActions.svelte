<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { LogOut, Trash2, AlertTriangle } from 'lucide-svelte';
  import { focusTrap } from '$lib/actions/focusTrap';

  interface Props {
    username: string | null;
    showDeleteOption: boolean;
    onLogout: () => void;
    onDeleteAccount: () => Promise<void>;
    showLogoutConfirm?: boolean;
    onLogoutConfirm?: () => void;
    onLogoutCancel?: () => void;
  }

  const {
    username,
    showDeleteOption,
    onLogout,
    onDeleteAccount,
    showLogoutConfirm = false,
    onLogoutConfirm,
    onLogoutCancel,
  }: Props = $props();

  let showDeleteConfirm = $state(false);
  let confirmButtonRef = $state<HTMLButtonElement | null>(null);
  let logoutConfirmRef = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (showDeleteConfirm && confirmButtonRef) {
      confirmButtonRef.focus();
    }
  });

  $effect(() => {
    if (showLogoutConfirm && logoutConfirmRef) {
      logoutConfirmRef.focus();
    }
  });

  async function handleDeleteConfirm() {
    showDeleteConfirm = false;
    await onDeleteAccount();
  }

  function handleKeyDown(e: KeyboardEvent, onCancel: () => void) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }
</script>

<div class="actions">
  {#if showLogoutConfirm}
    <div
      use:focusTrap
      class="confirm-dialog"
      role="alertdialog"
      aria-labelledby="logout-confirm-title"
      aria-describedby="logout-confirm-desc"
      tabindex="-1"
      onkeydown={(e) => handleKeyDown(e, () => onLogoutCancel?.())}
    >
      <AlertTriangle size={20} class="warning-icon" />
      <span id="logout-confirm-title" class="confirm-title text-base">Unsaved progress</span>
      <span id="logout-confirm-desc" class="confirm-desc text-sm">Log out anyway?</span>
      <div class="confirm-actions">
        <Button
          bind:ref={logoutConfirmRef}
          size="sm"
          variant="destructive"
          onclick={onLogoutConfirm}
        >
          Log Out
        </Button>
        <Button size="sm" variant="ghost" onclick={onLogoutCancel}>
          Cancel
        </Button>
      </div>
    </div>
  {:else}
    <Button variant="outline" onclick={onLogout} class="w-full">
      <LogOut size={16} />
      <span>Log Out ({username})</span>
    </Button>
  {/if}

  {#if showDeleteOption}
    {#if showDeleteConfirm}
      <div
        use:focusTrap
        class="confirm-dialog"
        role="alertdialog"
        aria-labelledby="delete-confirm-title"
        aria-describedby="delete-confirm-desc"
        tabindex="-1"
        onkeydown={(e) => handleKeyDown(e, () => (showDeleteConfirm = false))}
      >
        <AlertTriangle size={20} class="warning-icon" />
        <span id="delete-confirm-title" class="confirm-title text-base">Delete account?</span>
        <span id="delete-confirm-desc" class="confirm-desc text-sm">This action cannot be undone.</span>
        <div class="confirm-actions">
          <Button
            bind:ref={confirmButtonRef}
            size="sm"
            variant="destructive"
            onclick={handleDeleteConfirm}
          >
            Delete
          </Button>
          <Button size="sm" variant="ghost" onclick={() => (showDeleteConfirm = false)}>
            Cancel
          </Button>
        </div>
      </div>
    {:else}
      <Button variant="destructive" onclick={() => (showDeleteConfirm = true)} class="w-full">
        <Trash2 size={16} />
        <span>Delete Account</span>
      </Button>
    {/if}
  {/if}
</div>

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
