<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { LogOut, Trash2 } from 'lucide-svelte';

  interface Props {
    username: string | null;
    showDeleteOption: boolean;
    onLogout: () => Promise<void>;
    onDeleteAccount: () => Promise<void>;
  }

  const { username, showDeleteOption, onLogout, onDeleteAccount }: Props = $props();

  let showDeleteConfirm = $state(false);

  async function handleDeleteConfirm() {
    showDeleteConfirm = false;
    await onDeleteAccount();
  }
</script>

<div class="actions">
  <Button variant="outline" onclick={onLogout} class="w-full">
    <LogOut size={16} /> Logout ({username})
  </Button>
  {#if showDeleteOption}
    {#if showDeleteConfirm}
      <div class="delete-confirm">
        <span>Delete account?</span>
        <Button size="sm" variant="destructive" onclick={handleDeleteConfirm}>
          Confirm
        </Button>
        <Button size="sm" variant="ghost" onclick={() => (showDeleteConfirm = false)}>
          Cancel
        </Button>
      </div>
    {:else}
      <Button variant="destructive" onclick={() => (showDeleteConfirm = true)} class="w-full">
        <Trash2 size={16} /> Delete Account
      </Button>
    {/if}
  {/if}
</div>

<style>
  .delete-confirm {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: var(--font-size-sm);
  }
</style>
