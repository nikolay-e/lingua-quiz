<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { LogOut, Trash2 } from 'lucide-svelte';
  import ConfirmDialog from '../ConfirmDialog.svelte';

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

  async function handleDeleteConfirm() {
    showDeleteConfirm = false;
    await onDeleteAccount();
  }
</script>

<div class="actions">
  {#if showLogoutConfirm}
    <ConfirmDialog
      open={showLogoutConfirm}
      title="Unsaved progress"
      description="Log out anyway?"
      confirmLabel="Log Out"
      onconfirm={() => onLogoutConfirm?.()}
      oncancel={() => onLogoutCancel?.()}
      titleId="logout-confirm-title"
      descId="logout-confirm-desc"
    />
  {:else}
    <Button variant="outline" onclick={onLogout} class="w-full">
      <LogOut size={16} />
      <span>Log Out ({username})</span>
    </Button>
  {/if}

  {#if showDeleteOption}
    {#if showDeleteConfirm}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete account?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onconfirm={handleDeleteConfirm}
        oncancel={() => (showDeleteConfirm = false)}
        titleId="delete-confirm-title"
        descId="delete-confirm-desc"
      />
    {:else}
      <Button variant="destructive" onclick={() => (showDeleteConfirm = true)} class="w-full">
        <Trash2 size={16} />
        <span>Delete Account</span>
      </Button>
    {/if}
  {/if}
</div>
