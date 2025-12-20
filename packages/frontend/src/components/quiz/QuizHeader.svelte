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

<div>
  {#if !selectedQuiz}
    <div>
      <label for="quiz-select" class="sr-only">Select a quiz</label>
      <select
        id="quiz-select"
        class="w-full text-base"
        bind:value={selected}
        onchange={handleQuizSelect}
        disabled={loading}
        aria-label="Select a quiz to start learning"
      >
        <option value="" disabled>
          {loading ? 'Loading quizzes...' : 'Select a quiz to start learning'}
        </option>
        {#each wordLists as list (list.listName)}
          <option value={list.listName}>{list.listName}</option>
        {/each}
      </select>
    </div>
  {:else}
    <div class="flex justify-between items-center gap-4">
      <div class="flex items-center gap-2 text-primary">
        <BookOpen size={16} />
        <span class="text-lg font-semibold">{selectedQuiz}</span>
      </div>
      <Button variant="outline" size="sm" onclick={onBackToMenu}>
        <ArrowLeft size={16} />
        <span>Back to Menu</span>
      </Button>
    </div>
  {/if}
</div>
