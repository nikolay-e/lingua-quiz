<script lang="ts">
  import FeedCard from './FeedCard.svelte';
</script>

<main class="feed">
  <FeedCard dense>
    <header>
      <h1><i class="fas fa-language"></i> LinguaQuiz</h1>
    </header>
  </FeedCard>

  <FeedCard>
    <div class="auth-content">
      <slot />
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
