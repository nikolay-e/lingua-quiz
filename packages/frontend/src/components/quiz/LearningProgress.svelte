<script lang="ts">
  import { LEVEL_CONFIG } from '../../lib/config/levelConfig';
  import type { LevelWordLists } from '../../api-types';

  interface Props {
    selectedQuiz?: string | null;
    currentLevel?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    levelWordLists?: LevelWordLists;
    foldedLists?: Record<string, boolean>;
    onToggleFold?: (levelId: string) => void;
  }

  const {
    selectedQuiz = null,
    currentLevel = 'LEVEL_1',
    sourceLanguage = '',
    targetLanguage = '',
    levelWordLists = {},
    foldedLists = {},
    onToggleFold,
  }: Props = $props();

  function getLevelDescription(level: string): string {
    const levelConfig = LEVEL_CONFIG.find((config) => config.key === level);
    return levelConfig?.description(sourceLanguage, targetLanguage) || '';
  }

  const totalWords = $derived(
    Object.values(levelWordLists).reduce((sum, level) => sum + level.count, 0),
  );

  function getProgressText(count: number, total: number): string {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return `${count} of ${total} words (${percent}%)`;
  }
</script>

<div class="learning-progress-container flex-col gap-lg">
  {#if selectedQuiz}
    <div class="current-level-display flex-align-center gap-sm">
      <span class="text-sm font-medium text-foreground">Current Practice Level:</span>
      <span class="text-sm font-semibold text-primary">{getLevelDescription(currentLevel)}</span>
    </div>
  {/if}

  <section class="learning-progress">
    {#each Object.values(levelWordLists) as levelData (levelData.id)}
      <details
        id={levelData.id}
        class="level-details"
        open={!foldedLists[levelData.id]}
        ontoggle={() => onToggleFold?.(levelData.id)}
      >
        <summary class="level-summary">
          <div class="summary-content">
            <div class="summary-info">
              <levelData.icon size={16} aria-hidden="true" />
              <span>{levelData.label} ({levelData.count})</span>
            </div>
            <progress
              class="level-progress"
              value={levelData.count}
              max={totalWords}
              aria-label="{levelData.label}: {getProgressText(levelData.count, totalWords)}"
            >{getProgressText(levelData.count, totalWords)}</progress>
          </div>
        </summary>
        <div class="level-content">
          {#if levelData.words.length > 0}
            <ol id="{levelData.id}-list" class="word-list">
              {#each levelData.words as word (word)}
                <li class="word-item">{word}</li>
              {/each}
            </ol>
          {:else}
            <p class="empty-message">No words in this level yet.</p>
          {/if}
        </div>
      </details>
    {/each}
  </section>
</div>

<style>
  .current-level-display {
    background: var(--container-bg);
    border: 1px solid var(--input-border-color);
    border-radius: var(--radius-lg);
    padding: var(--spacing-sm) var(--spacing-md);
    box-shadow: var(--shadow-sm);
    transition: box-shadow var(--transition-speed) ease;
  }

  .current-level-display:hover {
    box-shadow: var(--shadow-md);
  }

  .learning-progress {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .level-details {
    border: 1px solid var(--input-border-color);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .level-summary {
    cursor: pointer;
    user-select: none;
    padding: var(--spacing-md) var(--spacing-lg);
    transition: all var(--transition-speed) ease;
    list-style: none;
  }

  .level-summary::-webkit-details-marker {
    display: none;
  }

  .level-summary::marker {
    display: none;
    content: '';
  }

  .level-summary:hover {
    background-color: color-mix(in oklch, var(--color-primary) 10%, transparent);
  }

  .level-summary:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  .summary-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .summary-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .summary-info::before {
    content: '▶';
    font-size: 0.65em;
    transition: transform var(--transition-speed-fast) ease;
  }

  .level-details[open] .summary-info::before {
    transform: rotate(90deg);
  }

  .level-progress {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    appearance: none;
    background: var(--color-muted);
  }

  .level-progress::-webkit-progress-bar {
    background: var(--color-muted);
    border-radius: 2px;
  }

  .level-progress::-webkit-progress-value {
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .level-progress::-moz-progress-bar {
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    border-radius: 2px;
  }

  .level-content {
    padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-lg);
    animation: content-reveal 0.2s ease-out;
  }

  @keyframes content-reveal {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .word-list {
    padding-inline-start: var(--spacing-xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .word-list li {
    padding-block: var(--spacing-xs);
    border-bottom: 1px solid var(--input-border-color);
  }

  .word-list li:last-child {
    border-bottom: none;
  }

  .empty-message {
    color: var(--color-muted-foreground);
    font-style: italic;
    font-size: var(--font-size-sm);
  }

  @media (prefers-reduced-motion: reduce) {
    .level-content {
      animation: none;
    }

    .summary-info::before {
      transition: none;
    }
  }
</style>
