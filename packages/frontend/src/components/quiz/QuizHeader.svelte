<script lang="ts">
  import type { WordList } from '../../api-types';
  import { Button } from '$lib/components/ui/button';
  import { BookOpen, ArrowLeft } from 'lucide-svelte';
  import LanguageLevelSelector from './LanguageLevelSelector.svelte';

  interface Props {
    wordLists?: WordList[];
    selectedQuiz?: string | null;
    loading?: boolean;
    onSelect?: (quiz: string) => void;
    onBackToMenu?: () => void;
  }

  const { wordLists = [], selectedQuiz = null, loading = false, onSelect, onBackToMenu }: Props = $props();

  function handleSelect(listName: string): void {
    onSelect?.(listName);
  }
</script>

<div>
  {#if !selectedQuiz}
    <LanguageLevelSelector
      {wordLists}
      {loading}
      onSelect={handleSelect}
    />
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
