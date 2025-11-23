<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { WordList } from '../../api-types';
  import { Button } from '$lib/components/ui/button';

  const dispatch = createEventDispatcher<{ select: { quiz: string }; backToMenu: void }>();

  export let wordLists: WordList[] = [];
  export let selectedQuiz: string | null = null;
  export let loading: boolean = false;

  let selected = '';

  function handleQuizSelect(): void {
    if (!selected) return;
    dispatch('select', { quiz: selected });
  }

  function handleBackToMenu(): void {
    dispatch('backToMenu');
  }
</script>

<div class="quiz-header">
  {#if !selectedQuiz}
    <div class="quiz-select-container">
      <select
        id="quiz-select"
        class="quiz-select"
        bind:value={selected}
        on:change={handleQuizSelect}
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
        <i class="fas fa-book"></i>
        <span class="quiz-name">{selectedQuiz}</span>
      </div>
      <Button variant="outline" size="sm" onclick={handleBackToMenu}>
        <i class="fas fa-arrow-left"></i>
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
    i {
      color: var(--primary-color);
    }
  }

  .quiz-name {
    font-weight: 600;
    color: var(--primary-color);
    font-size: var(--font-size-lg);
  }
</style>
