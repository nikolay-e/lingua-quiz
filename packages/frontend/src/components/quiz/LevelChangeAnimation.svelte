<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let isVisible = false;
  export let isLevelUp = true;

  const dispatch = createEventDispatcher();

  let animationElement: HTMLDivElement;

  $: if (isVisible && animationElement) {
    animationElement.style.animation = 'none';
    animationElement.offsetHeight;
    animationElement.style.animation = '';

    setTimeout(() => {
      dispatch('complete');
    }, 1500);
  }
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
      <div class="text">{isLevelUp ? 'Level Up!' : 'Level Down'}</div>
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
    border-color: var(--level-up-border);
    color: var(--level-up-text);
  }

  .level-down .animation-content {
    border-color: var(--level-down-border);
    color: var(--level-down-text);
  }

  .icon {
    font-size: var(--font-size-xl);
  }

  .text {
    font-size: var(--font-size-md);
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
