<script lang="ts">
  import FeedCard from './FeedCard.svelte';
  import { Languages } from 'lucide-svelte';

  interface Props {
    children: import('svelte').Snippet;
  }

  const { children }: Props = $props();
</script>

<main class="feed">
  <FeedCard dense>
    <header>
      <h1><Languages size={28} /> LinguaQuiz</h1>
    </header>
  </FeedCard>

  <FeedCard>
    <div class="auth-content">
      {@render children()}
    </div>
  </FeedCard>
</main>

<style>
  header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    h1 {
      margin: 0;
    }
  }

  .auth-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .auth-content :global(h2) {
    font-size: var(--font-size-xl);
    text-align: center;
    margin: 0;
  }
</style>
