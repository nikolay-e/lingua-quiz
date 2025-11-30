<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { ttsService, type TTSState } from '../../lib/services/ttsService';

  interface Props {
    token: string;
    text: string;
    language: string;
  }

  const { token, text, language }: Props = $props();

  let ttsState = $state<TTSState>({ isAvailable: false, supportedLanguages: [], isPlaying: false });

  const canUseTTS = $derived(ttsService.canUseTTS(language));

  onMount(() => {
    const unsubscribe = ttsService.subscribe((state) => {
      ttsState = state;
    });

    return () => {
      unsubscribe();
    };
  });

  function handlePlay() {
    ttsService.playTTS(token, text, language);
  }
</script>

{#if canUseTTS}
  <Button
    variant="outline"
    size="sm"
    class={ttsState.isPlaying ? 'speaking' : ''}
    onclick={handlePlay}
    disabled={ttsState.isPlaying}
    aria-label="Listen to pronunciation">
    <i class="fas fa-volume-up"></i>
    <span>{ttsState.isPlaying ? 'Playing…' : 'Listen'}</span>
  </Button>
{:else}
  <span class="tts-muted" aria-live="polite">TTS unavailable for {language || 'this language'}</span>
{/if}

<style>
  .tts-muted {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }
</style>
