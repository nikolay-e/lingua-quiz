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
  <div class="flex flex-col gap-2">
    {#if levelInfo}
      <div class="flex justify-between items-center">
        <span class="text-sm text-muted-foreground">{levelInfo.description}</span>
        <output class="text-sm text-muted-foreground font-medium">
          {completionPercent}%
        </output>
      </div>
      <progress
        class="w-full h-1.5 rounded-full appearance-none bg-muted
               [&::-webkit-progress-bar]:bg-muted
               [&::-webkit-progress-bar]:rounded-full
               [&::-webkit-progress-value]:bg-primary
               [&::-webkit-progress-value]:rounded-full
               [&::-webkit-progress-value]:transition-all
               [&::-moz-progress-bar]:bg-primary
               [&::-moz-progress-bar]:rounded-full"
        value={completionPercent}
        max="100"
        aria-label="Level completion: {completionPercent}%"
      >{completionPercent}%</progress>
    {/if}
    <div
      class="flex flex-col items-center justify-center min-h-20 px-6 py-4
             bg-primary/5 rounded-lg"
    >
      <span
        id="word"
        class="text-[clamp(1.25rem,4vw,1.75rem)] font-bold text-primary
               text-center break-words hyphens-auto"
        lang={questionLanguage}
      >
        {currentQuestion.questionText}
      </span>
    </div>
  </div>
{:else}
  <div
    class="flex flex-col items-center justify-center min-h-20 px-6 py-4
           bg-muted/50 rounded-lg opacity-70"
  >
    <span id="word" class="text-lg font-bold text-muted-foreground text-center">
      No more questions available.
    </span>
    <p class="text-sm text-muted-foreground mt-2">
      Select another quiz or check back later.
    </p>
  </div>
{/if}
