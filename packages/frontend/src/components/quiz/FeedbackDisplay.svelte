<script lang="ts">
  import { formatForDisplay, type SubmissionResult, type QuizQuestion, type RevealResult } from '@lingua-quiz/core';
  import { Button } from '$lib/components/ui/button';
  import { RefreshCw, ArrowRight } from 'lucide-svelte';
  import type { QuizFeedback } from '../../api-types';

  interface Props {
    feedback?: SubmissionResult | QuizFeedback | RevealResult | null;
    questionForFeedback?: QuizQuestion | null;
    onRetry?: () => void;
    onNext?: () => void;
  }

  const { feedback = null, questionForFeedback = null, onRetry, onNext }: Props = $props();

  const isSubmissionResult = $derived(feedback && 'isCorrect' in feedback);
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

  const feedbackClass = $derived.by(() => {
    if (isRevealResult) return 'revealed';
    if (isSuccess) return 'success';
    return 'error';
  });
</script>

{#if feedback}
  <div class="feedback-container" role="alert" aria-live="polite">
    <div class="feedback-text {feedbackClass}">
      <span class="feedback-icon" aria-hidden="true"></span>
      <span class="feedback-message">{feedbackMessage}</span>
    </div>
    <div class="button-row">
      {#if showRetry}
        <Button variant="outline" onclick={onRetry} class="retry-btn">
          <RefreshCw size={16} />
          <span>Try again</span>
        </Button>
      {/if}
      {#if (isSubmissionResult || isRevealResult) && onNext}
        <Button variant="default" onclick={onNext} class="next-btn">
          <span>Next Question</span>
          <ArrowRight size={16} />
        </Button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .feedback-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .feedback-text {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    font-weight: bold;
    background-color: var(--container-bg);
    border: 1px solid var(--input-border-color);
    border-radius: var(--radius-md);
    text-align: center;
  }

  .feedback-text.success {
    color: var(--success-color);
    border-color: var(--success-color);
  }

  .feedback-text.success .feedback-icon::before {
    content: '✓';
  }

  .feedback-text.error {
    color: var(--error-color);
    border-color: var(--error-color);
  }

  .feedback-text.error .feedback-icon::before {
    content: '✗';
  }

  .feedback-text.revealed {
    color: var(--color-muted-foreground);
  }

  .feedback-text.revealed .feedback-icon::before {
    content: '○';
  }

  .feedback-text .feedback-icon::before {
    color: inherit;
  }

  .button-row {
    display: flex;
    gap: var(--spacing-sm);
  }

  .button-row :global(.next-btn) {
    flex: 1;
  }

  .button-row :global(.retry-btn) {
    flex: 1;
  }
</style>
