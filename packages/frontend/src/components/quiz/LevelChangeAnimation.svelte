<script lang="ts">
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
    }, 1500);

    return () => clearTimeout(timer);
  });
</script>

{#if isVisible}
  <div
    bind:this={animationElement}
    class="level-change-animation {isLevelUp ? 'level-up' : 'level-down'}"
    role="alert"
    aria-live="polite"
  >
    <div class="animation-content">
      <div class="icon">{isLevelUp ? '⬆️' : '⬇️'}</div>
      <div class="text-content">
        <div class="title">{isLevelUp ? 'Level Up!' : 'Level Down'}</div>
        {#if fromLevel && toLevel}
          <div class="levels">{levelLabel(fromLevel)} → {levelLabel(toLevel)}</div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .level-change-animation {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    pointer-events: none;
  }

  .level-up {
    animation: level-up-animation 1.5s ease-out forwards;
  }

  .level-down {
    animation: level-down-animation 1.5s ease-out forwards;
  }

  .animation-content {
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    padding: var(--spacing-md) var(--spacing-xl);
    box-shadow: var(--shadow-xl);
    backdrop-filter: blur(10px);
    border: 2px solid;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    opacity: 0.95;
  }

  .icon {
    font-size: 1.5rem;
  }

  .text-content {
    display: flex;
    flex-direction: column;
  }

  .title {
    font-weight: bold;
    font-size: var(--font-size-lg);
  }

  .levels {
    font-size: var(--font-size-sm);
    opacity: 0.8;
  }

  .level-up .animation-content {
    border-color: var(--color-level-up-border);
    color: var(--color-level-up);
  }

  .level-down .animation-content {
    border-color: var(--color-level-down-border);
    color: var(--color-level-down);
  }

  @keyframes level-up-animation {
    0% {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 0;
    }

    20% {
      transform: translate(-50%, -50%) scale(1.2);
      opacity: 1;
    }

    40% {
      transform: translate(-50%, -50%) scale(1);
    }

    100% {
      transform: translate(-50%, -60%) scale(1);
      opacity: 0;
    }
  }

  @keyframes level-down-animation {
    0% {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 0;
    }

    20% {
      transform: translate(-50%, -50%) scale(1.2);
      opacity: 1;
    }

    40% {
      transform: translate(-50%, -50%) scale(1);
    }

    100% {
      transform: translate(-50%, -40%) scale(1);
      opacity: 0;
    }
  }
</style>
