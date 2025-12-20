<script lang="ts">
  import { cn } from '$lib/utils';
  import { ArrowUp, ArrowDown } from 'lucide-svelte';

  interface Props {
    isVisible?: boolean;
    isLevelUp?: boolean;
    fromLevel?: string;
    toLevel?: string;
    onComplete?: () => void;
  }

  // eslint-disable-next-line prefer-const -- Svelte 5 requires let for $bindable props
  let { isVisible = $bindable(false), isLevelUp = true, fromLevel, toLevel, onComplete }: Props =
    $props();

  let animationElement = $state<HTMLDivElement | null>(null);

  const levelLabel = (level: string | undefined) => level?.replace('LEVEL_', 'Level ') ?? '';

  $effect(() => {
    if (!isVisible || !animationElement) return;

    animationElement.style.animation = 'none';
    animationElement.offsetHeight;
    animationElement.style.animation = '';

    const timer = setTimeout(() => {
      onComplete?.();
    }, 1200);

    return () => clearTimeout(timer);
  });
</script>

{#if isVisible}
  <div
    bind:this={animationElement}
    class={cn(
      'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none',
      isLevelUp ? 'animate-level-up' : 'animate-level-down',
    )}
    role="alert"
    aria-live="polite"
  >
    <div
      class={cn(
        'flex items-center gap-3 px-6 py-4 rounded-lg border-2 bg-card/95 backdrop-blur-sm shadow-lg',
        isLevelUp ? 'border-success text-success' : 'border-destructive text-destructive',
      )}
    >
      <span class="text-2xl">
        {#if isLevelUp}
          <ArrowUp size={24} />
        {:else}
          <ArrowDown size={24} />
        {/if}
      </span>
      <div class="flex flex-col">
        <span class="font-bold text-lg">{isLevelUp ? 'Level Up!' : 'Level Down'}</span>
        {#if fromLevel && toLevel}
          <span class="text-sm opacity-80">{levelLabel(fromLevel)} → {levelLabel(toLevel)}</span>
        {/if}
      </div>
    </div>
  </div>
{/if}
