<script lang="ts">
  import { formatForDisplay, type SubmissionResult, type QuizQuestion } from '@lingua-quiz/core';
  import type { QuizFeedback } from '../../api-types';

  interface Props {
    feedback?: SubmissionResult | QuizFeedback | null;
    usageExamples?: { source: string; target: string } | null;
    questionForFeedback?: QuizQuestion | null;
  }

  const { feedback = null, usageExamples = null, questionForFeedback = null }: Props = $props();

  const isSuccess = $derived.by(() => {
    if (!feedback) return false;
    if ('isSuccess' in feedback) return feedback.isSuccess;
    return feedback.isCorrect;
  });

  const feedbackMessage = $derived.by(() => {
    if (!feedback) return '';
    if ('message' in feedback) return feedback.message;
    const questionText = questionForFeedback?.questionText ?? '';
    return `${questionText} = ${formatForDisplay(feedback.correctAnswerText)}`;
  });
</script>

{#if feedback}
  <div class="feedback-container" role="alert" aria-live="polite">
    <div class="feedback-text {isSuccess ? 'success' : 'error'} flex-center gap-sm text-center">
      <span class="feedback-icon" aria-hidden="true"></span>
      <span class="feedback-message">
        {feedbackMessage}
      </span>
    </div>
    {#if usageExamples}
      <div class="usage-examples">
        <div class="example-container flex-col gap-sm">
          <p>{usageExamples.source}</p>
          <p>{usageExamples.target}</p>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .feedback-container {
    margin-block-start: var(--spacing-md);
    background-color: var(--container-bg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .feedback-text {
    padding: var(--spacing-sm);
    font-weight: bold;

    &.success {
      color: var(--success-color);

      .feedback-icon::before {
        content: '✓';
      }
    }

    &.error {
      color: var(--error-color);

      .feedback-icon::before {
        content: '✗';
      }
    }

    .feedback-icon::before {
      color: inherit;
    }
  }

  .feedback-icon {
    font-size: var(--font-size-lg);
  }

  .feedback-message {
    font-size: var(--font-size-base);
  }

  .usage-examples {
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .example-container {
    p {
      background-color: var(--example-bg);
      padding: var(--spacing-xs);
      border-radius: var(--radius-md);
      margin: 0;
    }
  }
</style>
