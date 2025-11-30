<script lang="ts">
  import { Home, BarChart2, LogOut } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';

  interface Props {
    selectedQuiz: string | null;
    showProgress: boolean;
    onBackToMenu?: () => void;
    onToggleProgress?: () => void;
    onLogout?: () => void;
  }

  const { selectedQuiz, showProgress, onBackToMenu, onToggleProgress, onLogout }: Props = $props();
</script>

<nav class="bottom-nav" aria-label="Bottom navigation">
  {#if selectedQuiz}
    <Button
      variant="ghost"
      size="sm"
      class="nav-button"
      onclick={onBackToMenu}
      aria-label="Back to menu"
    >
      <Home size={20} />
      <span class="nav-label">Menu</span>
    </Button>
    <Button
      variant="ghost"
      size="sm"
      class="nav-button"
      onclick={onToggleProgress}
      aria-label={showProgress ? 'Hide progress' : 'Show progress'}
    >
      <BarChart2 size={20} />
      <span class="nav-label">Progress</span>
    </Button>
  {/if}
  <Button
    variant="ghost"
    size="sm"
    class="nav-button"
    onclick={onLogout}
    aria-label="Log out"
  >
    <LogOut size={20} />
    <span class="nav-label">Logout</span>
  </Button>
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: none;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    padding: var(--spacing-xs);
    padding-bottom: max(var(--spacing-xs), env(safe-area-inset-bottom, 0px));
    justify-content: space-around;
    align-items: center;
    box-shadow: 0 -2px 8px rgb(0 0 0 / 0.1);
  }

  @media (width <= 767px) {
    .bottom-nav {
      display: flex;
    }
  }

  .bottom-nav :global(.nav-button) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-height: 56px;
    min-width: 64px;
    padding: var(--spacing-xs);
  }

  .nav-label {
    font-size: var(--font-size-sm);
  }
</style>
