<script lang="ts">
  import type { QuizQuestion } from '@lingua-quiz/core';
  import { LEVEL_CONFIG } from '../../lib/config/levelConfig';
  import type { LevelWordLists } from '../../api-types';

  interface Props {
    currentQuestion?: QuizQuestion | null;
    levelWordLists?: LevelWordLists;
  }

  const { currentQuestion = null, levelWordLists = {} }: Props = $props();

  const questionLanguage = $derived(currentQuestion?.sourceLanguage || 'en');

  const levelInfo = $derived.by(() => {
    if (!currentQuestion) return null;
    const config = LEVEL_CONFIG.find((c) => c.key === currentQuestion.level);
    if (!config) return null;
    return {
      label: config.label,
      description: config.description(currentQuestion.sourceLanguage, currentQuestion.targetLanguage),
      id: config.id,
    };
  });

  const totalWords = $derived(
    Object.values(levelWordLists).reduce((sum, level) => sum + level.count, 0),
  );

  const currentLevelCount = $derived.by(() => {
    if (!levelInfo) return 0;
    return levelWordLists[levelInfo.id]?.count ?? 0;
  });

  const completionPercent = $derived(
    totalWords > 0 ? Math.round(((totalWords - currentLevelCount) / totalWords) * 100) : 0,
  );
</script>

{#if currentQuestion}
  <div class="question-wrapper">
    {#if levelInfo}
      <div class="level-indicator">
        <span class="level-text">{levelInfo.description}</span>
        <output class="level-percent">{completionPercent}%</output>
      </div>
      <progress
        class="completion-progress"
        value={completionPercent}
        max="100"
        aria-label="Level completion: {completionPercent}%"
      >{completionPercent}%</progress>
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

  .level-indicator {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .level-text {
    font-size: var(--font-size-sm);
    color: var(--color-muted-foreground);
  }

  .level-percent {
    font-size: var(--font-size-sm);
    color: var(--color-muted-foreground);
    font-weight: var(--font-weight-medium);
  }

  .completion-progress {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    appearance: none;
    background: var(--color-muted);
  }

  .completion-progress::-webkit-progress-bar {
    background: var(--color-muted);
    border-radius: 3px;
  }

  .completion-progress::-webkit-progress-value {
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .completion-progress::-moz-progress-bar {
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    border-radius: 3px;
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
