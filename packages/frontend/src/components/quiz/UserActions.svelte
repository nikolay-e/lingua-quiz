<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { Settings } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';

  interface Props {
    username: string | null;
  }

  const { username }: Props = $props();

  async function navigateToSettings() {
    await goto('/settings');
  }
</script>

<div class="actions">
  <Button variant="outline" onclick={navigateToSettings} class="w-full">
    <Settings size={16} />
    <span>{$_('common.settings')} ({username})</span>
  </Button>
</div>
