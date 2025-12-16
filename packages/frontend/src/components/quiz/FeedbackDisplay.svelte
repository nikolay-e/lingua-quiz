<script lang="ts">
  import { formatForDisplay, type SubmissionResult, type QuizQuestion, type RevealResult } from '@lingua-quiz/core';
  import { tick } from 'svelte';
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

  let nextButtonRef = $state<HTMLButtonElement | null>(null);
  let retryButtonRef = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (feedback === null) return;

    tick().then(() => {
      if (nextButtonRef !== null) {
        nextButtonRef.focus();
      } else if (retryButtonRef !== null) {
        retryButtonRef.focus();
      }
    });
  });

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
        <Button
          variant="outline"
          onclick={onRetry}
          class="retry-btn"
          bind:ref={retryButtonRef}
        >
          <RefreshCw size={16} />
          <span>Try again</span>
        </Button>
      {/if}
      {#if (isSubmissionResult || isRevealResult) && onNext}
        <Button
          variant="default"
          onclick={onNext}
          class="next-btn"
          bind:ref={nextButtonRef}
        >
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
    min-height: 2.5rem;
    font-weight: bold;
    background-color: var(--container-bg);
    border: 2px solid var(--input-border-color);
    border-radius: var(--radius-md);
    text-align: center;
  }

  .feedback-text.success {
    color: var(--success-color);
    border-color: var(--success-color);
    background-color: color-mix(in oklch, var(--success-color) 10%, var(--container-bg));
    animation: success-pulse 0.4s ease-out;
  }

  .feedback-text.success .feedback-icon::before {
    content: '✓';
    display: inline-block;
    animation: icon-pop 0.3s ease-out;
  }

  .feedback-text.error {
    color: var(--error-color);
    border-color: var(--error-color);
    background-color: color-mix(in oklch, var(--error-color) 10%, var(--container-bg));
    animation: shake 0.5s ease-out;
  }

  .feedback-text.error .feedback-icon::before {
    content: '✗';
  }

  .feedback-text.revealed {
    color: var(--color-muted-foreground);
    animation: fade-in 0.2s ease-out;
  }

  .feedback-text.revealed .feedback-icon::before {
    content: '○';
  }

  .feedback-text .feedback-icon::before {
    color: inherit;
    font-size: 1.2em;
  }

  @keyframes success-pulse {
    0% {
      transform: scale(0.95);
      opacity: 0;
    }
    50% {
      transform: scale(1.02);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes icon-pop {
    0% {
      transform: scale(0);
    }
    50% {
      transform: scale(1.3);
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes shake {
    0%, 100% {
      transform: translateX(0);
    }
    10%, 30%, 50%, 70%, 90% {
      transform: translateX(-6px);
    }
    20%, 40%, 60%, 80% {
      transform: translateX(6px);
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .button-row {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .button-row :global(.next-btn),
  .button-row :global(.retry-btn) {
    width: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    .feedback-text.success,
    .feedback-text.error,
    .feedback-text.revealed {
      animation: none;
    }

    .feedback-text.success .feedback-icon::before {
      animation: none;
    }
  }
</style>
