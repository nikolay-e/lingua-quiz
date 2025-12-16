<script lang="ts">
  import FeedCard from './FeedCard.svelte';
  import EnvironmentInfo from './EnvironmentInfo.svelte';
  import { Languages } from 'lucide-svelte';

  interface Props {
    children: import('svelte').Snippet;
  }

  const { children }: Props = $props();
</script>

<main id="main-content" class="feed">
  <FeedCard dense>
    <header>
      <h1><Languages size={28} /> LinguaQuiz</h1>
    </header>
  </FeedCard>

  <FeedCard>
    <div class="auth-content text-xl">
      {@render children()}
    </div>
  </FeedCard>

  <EnvironmentInfo />
</main>

<style>
  header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  header h1 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .auth-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .auth-content :global(h2) {
    text-align: center;
    margin: 0;
  }
</style>
