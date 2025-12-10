<script lang="ts">
  import type { QuizQuestion } from '@lingua-quiz/core';

  interface Props {
    currentQuestion?: QuizQuestion | null;
    questionNumber?: number;
    totalQuestions?: number;
  }

  const { currentQuestion = null, questionNumber, totalQuestions }: Props = $props();

  const questionLanguage = $derived(currentQuestion?.sourceLanguage || 'en');
  const showProgress = $derived(questionNumber !== undefined && totalQuestions !== undefined && totalQuestions > 0);
</script>

{#if currentQuestion}
  <div class="question-wrapper">
    {#if showProgress}
      <div class="progress-indicator">
        <span class="progress-text">Question {questionNumber} of {totalQuestions}</span>
        <div
          class="progress-bar-mini"
          role="progressbar"
          aria-valuenow={questionNumber}
          aria-valuemin="1"
          aria-valuemax={totalQuestions}
        >
          <div
            class="progress-fill-mini"
            style="width: {(questionNumber! / totalQuestions!) * 100}%"
          ></div>
        </div>
      </div>
    {/if}
    <div class="question">
      <span id="word" class="question-text" lang={questionLanguage}>
        {currentQuestion.questionText}
      </span>
    </div>
  </div>
{:else}
  <div class="question empty">
    <span id="word" class="question-text empty-text">No more questions available.</span>
    <p class="empty-hint">Select another quiz or check back later.</p>
  </div>
{/if}

<style>
  .question-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .progress-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .progress-text {
    font-size: var(--font-size-sm);
    color: var(--color-muted-foreground);
    white-space: nowrap;
  }

  .progress-bar-mini {
    flex: 1;
    height: 4px;
    background: var(--color-muted);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill-mini {
    height: 100%;
    background: var(--color-primary);
    transition: width 0.3s ease;
  }

  .question {
    padding: var(--spacing-md) var(--spacing-lg);
    background: linear-gradient(135deg, var(--color-feature-gradient-start), var(--color-feature-gradient-end));
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80px;
  }

  .question-text {
    font-size: clamp(1.25rem, 4vw, 1.75rem);
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
    text-align: center;
    overflow-wrap: anywhere;
    hyphens: auto;
  }

  .empty {
    opacity: 0.7;
  }

  .empty-text {
    font-size: var(--font-size-lg);
  }

  .empty-hint {
    font-size: var(--font-size-sm);
    color: var(--color-muted-foreground);
    margin: var(--spacing-xs) 0 0;
  }
</style>
