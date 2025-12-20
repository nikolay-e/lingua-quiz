<script lang="ts">
  import { LEVEL_CONFIG } from '../../lib/config/levelConfig';
  import { ChevronRight } from 'lucide-svelte';
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

<div class="flex flex-col gap-6">
  {#if selectedQuiz}
    <div
      class="flex items-center gap-3 bg-card border border-border rounded-lg
             px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <span class="text-sm font-medium text-foreground">Current Practice Level:</span>
      <span class="text-sm font-semibold text-primary">
        {getLevelDescription(currentLevel)}
      </span>
    </div>
  {/if}

  <section class="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0">
    {#each Object.values(levelWordLists) as levelData (levelData.id)}
      <details
        id={levelData.id}
        class="group border border-border rounded-lg overflow-hidden"
        open={!foldedLists[levelData.id]}
        ontoggle={() => onToggleFold?.(levelData.id)}
      >
        <summary
          class="cursor-pointer select-none px-4 py-3 transition-colors
                 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary
                 focus-visible:outline-offset-[-2px] list-none [&::-webkit-details-marker]:hidden"
        >
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-3">
              <ChevronRight
                size={14}
                class="transition-transform group-open:rotate-90"
                aria-hidden="true"
              />
              <levelData.icon size={16} aria-hidden="true" />
              <span class="text-sm font-medium">
                {levelData.label} ({levelData.count})
              </span>
            </div>
            <progress
              class="w-full h-1 rounded-full appearance-none bg-muted
                     [&::-webkit-progress-bar]:bg-muted
                     [&::-webkit-progress-bar]:rounded-full
                     [&::-webkit-progress-value]:bg-primary
                     [&::-webkit-progress-value]:rounded-full
                     [&::-webkit-progress-value]:transition-all
                     [&::-moz-progress-bar]:bg-primary
                     [&::-moz-progress-bar]:rounded-full"
              value={levelData.count}
              max={totalWords}
              aria-label="{levelData.label}: {getProgressText(levelData.count, totalWords)}"
            >{getProgressText(levelData.count, totalWords)}</progress>
          </div>
        </summary>
        <div class="px-4 pb-4 pt-2 animate-content-reveal">
          {#if levelData.words.length > 0}
            <ol id="{levelData.id}-list" class="pl-8 flex flex-col gap-2">
              {#each levelData.words as word (word)}
                <li class="py-2 border-b border-border last:border-b-0 text-sm">{word}</li>
              {/each}
            </ol>
          {:else}
            <p class="text-muted-foreground italic text-sm">No words in this level yet.</p>
          {/if}
        </div>
      </details>
    {/each}
  </section>
</div>
