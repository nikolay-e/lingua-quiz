<script lang="ts">
  import type { QuizQuestion } from '@lingua-quiz/core';

  interface Props {
    currentQuestion?: QuizQuestion | null;
  }

  const { currentQuestion = null }: Props = $props();

  const questionLanguage = $derived(currentQuestion?.sourceLanguage || 'en');
</script>

{#if currentQuestion}
  <div class="question">
    <span id="word" class="question-text" lang={questionLanguage}>
      {currentQuestion.questionText}
    </span>
  </div>
{:else}
  <div class="question">
    <span id="word" class="question-text">No more questions available.</span>
  </div>
{/if}

<style>
  .question {
    padding: var(--spacing-sm) var(--spacing-md);
    background: linear-gradient(135deg, #f8f9ff, #e8f0ff);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global([data-theme='dark']) .question {
    background: linear-gradient(135deg, #2a3441, #1e2a38);
  }

  .question-text {
    font-size: var(--font-size-xl);
    font-weight: bold;
    color: var(--color-secondary);
    text-align: center;
  }
</style>
