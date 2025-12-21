<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { ttsService, type TTSState } from '../../lib/services/ttsService';
  import { Volume2 } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';

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
      ttsService.stopCurrentAudio();
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
    aria-label={$_('quiz.listenPronunciation')}>
    <Volume2 size={16} />
    <span>{ttsState.isPlaying ? $_('quiz.playing') : $_('quiz.listen')}</span>
  </Button>
{:else}
  <span class="tts-muted text-sm" aria-live="polite">{$_('quiz.ttsUnavailable', { values: { language: language || 'this language' } })}</span>
{/if}

<style>
  .tts-muted {
    color: var(--color-text-muted);
  }
</style>
