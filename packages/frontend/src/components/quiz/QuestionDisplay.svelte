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
        <span class="level-percent">{completionPercent}%</span>
      </div>
      <div
        class="progress-bar"
        role="progressbar"
        aria-valuenow={completionPercent}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Level completion progress"
      >
        <div class="progress-fill" style="width: {completionPercent}%"></div>
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

  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--color-muted);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
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
