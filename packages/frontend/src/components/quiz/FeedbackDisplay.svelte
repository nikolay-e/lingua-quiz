<script lang="ts">
  import { formatForDisplay, type SubmissionResult, type QuizQuestion } from '@lingua-quiz/core';
  import type { QuizFeedback } from '../../api-types';

  export let feedback: SubmissionResult | QuizFeedback | null = null;
  export let usageExamples: { source: string; target: string } | null = null;
  export let questionForFeedback: QuizQuestion | null = null;

  $: {
    if (!feedback) {
      isSuccess = false;
    } else if ('isSuccess' in feedback) {
      // eslint-disable-next-line prefer-destructuring
      isSuccess = feedback.isSuccess;
    } else {
      isSuccess = feedback.isCorrect;
    }
  }
  let isSuccess = false;

  $: {
    if (!feedback) {
      feedbackMessage = '';
    } else if ('message' in feedback) {
      feedbackMessage = feedback.message;
    } else {
      const questionText = questionForFeedback?.questionText ?? '';
      feedbackMessage = `${questionText} = ${formatForDisplay(feedback.correctAnswerText)}`;
    }
  }
  let feedbackMessage = '';
</script>

{#if feedback}
  <div class="feedback-container" role="alert" aria-live="polite">
    <div class="feedback-text {isSuccess ? 'success' : 'error'} flex-center text-center">
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
    margin-top: var(--spacing-md);
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
    margin-right: var(--spacing-sm);
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
