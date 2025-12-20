<script lang="ts">
  import { formatForDisplay, type SubmissionResult, type QuizQuestion, type RevealResult } from '@lingua-quiz/core';
  import { Button } from '$lib/components/ui/button';
  import { RefreshCw, Check, X, Circle } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import type { QuizFeedback } from '../../api-types';

  interface Props {
    feedback?: SubmissionResult | QuizFeedback | RevealResult | null;
    questionForFeedback?: QuizQuestion | null;
    onRetry?: () => void;
  }

  const { feedback = null, questionForFeedback = null, onRetry }: Props = $props();

  let retryButtonRef = $state<HTMLButtonElement | null>(null);

  const isRevealResult = $derived(feedback && 'correctAnswerText' in feedback && !('isCorrect' in feedback) && !('isSuccess' in feedback));

  const isSuccess = $derived.by(() => {
    if (!feedback) return false;
    if ('isSuccess' in feedback) return feedback.isSuccess;
    if ('isCorrect' in feedback) return feedback.isCorrect;
    return false;
  });

  const isQuizFeedback = $derived(feedback && 'isSuccess' in feedback && !('isCorrect' in feedback));
  const showRetry = $derived(isQuizFeedback && !isSuccess && onRetry);

  const feedbackMessage = $derived.by(() => {
    if (!feedback) return '';
    if ('message' in feedback) return feedback.message;
    const questionText = questionForFeedback?.questionText ?? '';
    return `${questionText} = ${formatForDisplay(feedback.correctAnswerText)}`;
  });
</script>

{#if feedback}
  <div class="flex flex-col gap-3" role="alert" aria-live="polite">
    <div
      class={cn(
        'flex items-center justify-center gap-3 px-4 py-3 min-h-10 font-semibold rounded-lg border text-center transition-all',
        isRevealResult && 'text-muted-foreground bg-muted/50 border-border animate-fade-in',
        isSuccess && 'text-success bg-success/10 border-success ring-1 ring-success animate-success-pulse',
        !isRevealResult && !isSuccess && 'text-destructive bg-destructive/10 border-destructive ring-1 ring-destructive animate-shake',
      )}
    >
      <span class="text-lg" aria-hidden="true">
        {#if isRevealResult}
          <Circle size={18} />
        {:else if isSuccess}
          <Check size={18} class="animate-icon-pop" />
        {:else}
          <X size={18} />
        {/if}
      </span>
      <span>{feedbackMessage}</span>
    </div>
    {#if showRetry}
      <Button
        variant="outline"
        onclick={onRetry}
        class="w-full"
        bind:ref={retryButtonRef}
      >
        <RefreshCw size={16} />
        <span>Try again</span>
      </Button>
    {/if}
  </div>
{/if}
