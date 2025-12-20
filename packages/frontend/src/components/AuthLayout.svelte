<script lang="ts">
  import FeedCard from './FeedCard.svelte';
  import { Languages } from 'lucide-svelte';

  interface Props {
    children: import('svelte').Snippet;
  }

  const { children }: Props = $props();
</script>

<main id="main-content" class="feed">
  <FeedCard dense>
    <header class="flex items-center gap-2">
      <h1 class="m-0 text-primary text-xl flex items-center gap-1">
        <Languages size={28} /> LinguaQuiz
      </h1>
    </header>
  </FeedCard>

  <FeedCard>
    <div class="auth-content text-xl">
      {@render children()}
    </div>
  </FeedCard>
</main>

<style>
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
