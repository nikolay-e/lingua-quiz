<script lang="ts">
  import { Skeleton } from '$lib/components/ui/skeleton';
  import FeedCard from '../FeedCard.svelte';
</script>

<div class="quiz-skeleton">
  <FeedCard>
    <div class="header-skeleton">
      <Skeleton class="h-8 w-48" />
    </div>
    <div class="select-skeleton">
      <Skeleton class="h-10 w-full" />
    </div>
  </FeedCard>

  <FeedCard dense>
    <div class="question-skeleton">
      <Skeleton class="h-12 w-3/4 mx-auto" />
    </div>
  </FeedCard>

  <FeedCard dense>
    <div class="input-skeleton">
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-24" />
    </div>
  </FeedCard>

  <FeedCard>
    <div class="progress-skeleton">
      <Skeleton class="h-6 w-48 mb-md" />
      {#each Array(4) as _, i (i)}
        <Skeleton class="h-12 w-full mb-sm" />
      {/each}
    </div>
  </FeedCard>
</div>

<style>
  .header-skeleton {
    padding: var(--spacing-md);
  }

  .select-skeleton {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .question-skeleton {
    padding: var(--spacing-lg);
    display: flex;
    justify-content: center;
  }

  .input-skeleton {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
  }

  .progress-skeleton {
    padding: var(--spacing-md);
  }
</style>
