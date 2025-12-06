<script lang="ts">
  interface Props {
    isVisible?: boolean;
    isLevelUp?: boolean;
    onComplete?: () => void;
  }

  // eslint-disable-next-line prefer-const -- Svelte 5 requires let for $bindable props
  let { isVisible = $bindable(false), isLevelUp = true, onComplete }: Props = $props();

  let animationElement = $state<HTMLDivElement | null>(null);

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
      <div class="icon text-xl">{isLevelUp ? '⬆️' : '⬇️'}</div>
      <div class="text text-lg">{isLevelUp ? 'Level Up!' : 'Level Down'}</div>
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
    font-weight: bold;
    opacity: 0.95;
  }

  .level-up .animation-content {
    border-color: #4ade80;
    color: #059669;
  }

  .level-down .animation-content {
    border-color: #f87171;
    color: #dc2626;
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
