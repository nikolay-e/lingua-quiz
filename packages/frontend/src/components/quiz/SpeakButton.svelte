<script lang="ts">
  import { speak, stopSpeaking, isSpeechSupported, loadVoices } from '$lib/speech';
  import { onMount } from 'svelte';

  export let text: string;
  export let lang: string = 'en-US';
  export let rate: number = 0.9;
  export let size: 'sm' | 'md' | 'lg' = 'md';

  let speaking = false;
  let supported = false;
  let voicesLoaded = false;

  onMount(async () => {
    supported = isSpeechSupported();
    if (supported) {
      await loadVoices();
      voicesLoaded = true;
    }
  });

  async function handleClick() {
    if (!supported || !voicesLoaded) return;

    if (speaking) {
      stopSpeaking();
      speaking = false;
      return;
    }

    speaking = true;
    try {
      await speak(text, { lang, rate });
    } catch (error) {
      console.error('Speech failed:', error);
    } finally {
      speaking = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }

  $: sizeClass = `speak-btn-${size}`;
  $: label = speaking ? 'Stop speaking' : `Speak ${text}`;
</script>

{#if supported}
  <button
    type="button"
    class="speak-btn {sizeClass}"
    class:speaking
    on:click={handleClick}
    on:keydown={handleKeydown}
    aria-label={label}
    title={label}
    disabled={!voicesLoaded}
  >
    {#if speaking}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect
          x="6"
          y="4"
          width="4"
          height="16"
        />
        <rect
          x="14"
          y="4"
          width="4"
          height="16"
        />
      </svg>
    {:else}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    {/if}
  </button>
{/if}

<style>
  .speak-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: var(--radius-full);
    background-color: var(--primary-color);
    color: var(--color-primary-foreground);
    cursor: pointer;
    transition: all var(--transition-speed) ease;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    &:hover:not(:disabled) {
      background-color: color-mix(in oklch, var(--primary-color) 85%, black);
      transform: scale(1.1);
    }

    &.speaking {
      background-color: var(--error-color);
      animation: pulse 1.5s infinite;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.7;
    }
  }

  .speak-btn-sm {
    width: 2rem;
    height: 2rem;
    padding: var(--spacing-xs);
  }

  .speak-btn-md {
    width: 2.5rem;
    height: 2.5rem;
    padding: var(--spacing-sm);
  }

  .speak-btn-lg {
    width: 3rem;
    height: 3rem;
    padding: calc(var(--spacing-sm) + 2px);
  }

  svg {
    width: 100%;
    height: 100%;
  }
</style>
