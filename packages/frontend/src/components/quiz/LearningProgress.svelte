<script lang="ts">
  import { LEVEL_CONFIG } from '../../lib/config/levelConfig';
  import type { LevelWordLists } from '../../api-types';
  import { ChevronRight, ChevronDown } from 'lucide-svelte';

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
      <div id="{levelData.id}" class="foldable-section">
        <button
          class="foldable-header"
          onclick={() => onToggleFold?.(levelData.id)}
          aria-expanded={!foldedLists[levelData.id]}
        >
          <div class="header-content">
            <div class="header-info">
              <span class="fold-icon">
                {#if foldedLists[levelData.id]}
                  <ChevronRight size={16} />
                {:else}
                  <ChevronDown size={16} />
                {/if}
              </span>
              <levelData.icon size={16} />
              <span>{levelData.label} ({levelData.count})</span>
            </div>
            <div
              class="progress-bar"
              role="progressbar"
              aria-valuenow={levelData.count}
              aria-valuemin="0"
              aria-valuemax={totalWords}
              aria-valuetext={getProgressText(levelData.count, totalWords)}
              aria-label="{levelData.label} progress"
            >
              <div
                class="progress-fill"
                style="width: {totalWords > 0 ? (levelData.count / totalWords) * 100 : 0}%"
              ></div>
            </div>
          </div>
        </button>
        {#if !foldedLists[levelData.id]}
          {#if levelData.words.length > 0}
            <div class="foldable-content">
              <ol id="{levelData.id}-list" class="word-list">
                {#each levelData.words as word (word)}
                  <li class="word-item">{word}</li>
                {/each}
              </ol>
            </div>
          {:else}
            <div class="foldable-content">
              <p class="no-words text-center opacity-60 p-md">No words in this level yet.</p>
            </div>
          {/if}
        {/if}
      </div>
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
  }

  .word-list {
    padding-inline-start: var(--spacing-2xl);
    margin-block-start: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .word-list li {
    padding-block: var(--spacing-xs);
    border-bottom: 1px solid var(--input-border-color);
  }

  .no-words {
    font-style: italic;
  }

  .foldable-header {
    cursor: pointer;
    user-select: none;
    background: none;
    border: 1px solid var(--input-border-color);
    color: var(--text-color);
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--radius-sm);
    transition: all var(--transition-speed) ease;
    width: 100%;
    text-align: left;
  }

  .foldable-header:hover {
    background-color: color-mix(in oklch, var(--color-primary) 10%, transparent);
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .foldable-header:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .header-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    width: 100%;
  }

  .header-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
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

  .fold-icon {
    margin-inline-end: var(--spacing-sm);
    transition: transform var(--transition-speed-fast) ease;
    color: var(--text-color);
    opacity: 0.6;
  }

  .foldable-content {
    animation: fade-in var(--transition-speed) ease;
    margin-block-start: var(--spacing-sm);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }
</style>
