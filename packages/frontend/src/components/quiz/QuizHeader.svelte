<script lang="ts">
  import type { WordList } from '../../api-types';
  import { Button } from '$lib/components/ui/button';
  import { BookOpen, ArrowLeft } from 'lucide-svelte';

  interface Props {
    wordLists?: WordList[];
    selectedQuiz?: string | null;
    loading?: boolean;
    onSelect?: (quiz: string) => void;
    onBackToMenu?: () => void;
  }

  const { wordLists = [], selectedQuiz = null, loading = false, onSelect, onBackToMenu }: Props = $props();

  let selected = $state('');

  function handleQuizSelect(): void {
    if (!selected) return;
    onSelect?.(selected);
  }
</script>

<div class="quiz-header">
  {#if !selectedQuiz}
    <div class="quiz-select-container">
      <select
        id="quiz-select"
        class="quiz-select"
        bind:value={selected}
        onchange={handleQuizSelect}
        disabled={loading}
      >
        <option value="" disabled>
          {loading ? 'Loading quizzes...' : '🎯 Select a quiz to start learning'}
        </option>
        {#each wordLists as list (list.listName)}
          <option value={list.listName}>{list.listName}</option>
        {/each}
      </select>
    </div>
  {:else}
    <div class="selected-quiz-header flex-between gap-md">
      <div class="quiz-info flex-align-center gap-xs">
        <BookOpen size={18} />
        <span class="quiz-name">{selectedQuiz}</span>
      </div>
      <Button variant="outline" size="sm" onclick={onBackToMenu}>
        <ArrowLeft size={16} />
        <span>Back to Menu</span>
      </Button>
    </div>
  {/if}
</div>

<style>
  .quiz-select-container {
    margin-block-start: var(--spacing-md);
  }

  .quiz-select {
    background-color: var(--container-bg);
    color: var(--text-color);
    border: 2px solid var(--input-border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    font-size: var(--font-size-base);
    transition: border-color var(--transition-speed) ease;

    &:focus-visible {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgb(74 144 226 / 0.2);
    }

    &:disabled {
      background-color: var(--color-disabled-bg);
      color: var(--color-disabled-text);
      border-color: var(--color-disabled-border);
      cursor: not-allowed;
    }
  }

  .selected-quiz-header {
    margin-block-start: var(--spacing-md);
  }

  .quiz-info {
    :global(svg) {
      color: var(--primary-color);
    }
  }

  .quiz-name {
    font-weight: 600;
    color: var(--primary-color);
    font-size: var(--font-size-lg);
  }
</style>
