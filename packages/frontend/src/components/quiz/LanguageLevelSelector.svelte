<script lang="ts">
  import type { WordList } from '../../api-types';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select';
  import { Button } from '$lib/components/ui/button';
  import { Languages, GraduationCap, BookOpen, Play } from 'lucide-svelte';

  interface Props {
    wordLists: WordList[];
    loading?: boolean;
    onSelect: (listName: string) => void;
  }

  const { wordLists, loading = false, onSelect }: Props = $props();

  const LANGUAGE_LABELS: Record<string, string> = {
    english: 'English',
    german: 'German',
    spanish: 'Spanish',
    russian: 'Russian',
    en: 'English',
    de: 'German',
    es: 'Spanish',
    ru: 'Russian',
  };

  const LEVEL_LABELS: Record<string, string> = {
    a0: 'A0 — Cognates',
    a1: 'A1 — Beginner',
    a2: 'A2 — Elementary',
    b1: 'B1 — Intermediate',
    b2: 'B2 — Upper Intermediate',
    c1: 'C1 — Advanced',
    c2: 'C2 — Proficiency',
  };

  type ParsedList = {
    source: string;
    target: string;
    level: string;
    listName: string;
    wordCount: number;
  };

  function parseListName(list: WordList): ParsedList | null {
    const match = list.listName.match(/^(\w+)-(\w+)-([a-c]\d)$/i);
    if (!match || !match[1] || !match[2] || !match[3]) return null;
    return {
      source: match[1].toLowerCase(),
      target: match[2].toLowerCase(),
      level: match[3].toLowerCase(),
      listName: list.listName,
      wordCount: list.wordCount,
    };
  }

  const parsedLists = $derived(
    wordLists.map(parseListName).filter((p): p is ParsedList => p !== null),
  );

  const sourceLanguages = $derived(
    [...new Set(parsedLists.map((p) => p.source))].sort(),
  );

  let selectedSource = $state<string | undefined>(undefined);
  let selectedTarget = $state<string | undefined>(undefined);
  let selectedLevel = $state<string | undefined>(undefined);

  const targetLanguages = $derived.by(() => {
    if (!selectedSource) return [];
    return [
      ...new Set(
        parsedLists.filter((p) => p.source === selectedSource).map((p) => p.target),
      ),
    ].sort();
  });

  const availableLevels = $derived.by(() => {
    if (!selectedSource || !selectedTarget) return [];
    return parsedLists
      .filter((p) => p.source === selectedSource && p.target === selectedTarget)
      .map((p) => ({ level: p.level, wordCount: p.wordCount }))
      .sort((a, b) => a.level.localeCompare(b.level));
  });

  const selectedList = $derived.by(() => {
    if (!selectedSource || !selectedTarget || !selectedLevel) return null;
    return parsedLists.find(
      (p) =>
        p.source === selectedSource &&
        p.target === selectedTarget &&
        p.level === selectedLevel,
    );
  });

  function handleSourceChange(value: string | undefined): void {
    selectedSource = value;
    selectedTarget = undefined;
    selectedLevel = undefined;
  }

  function handleTargetChange(value: string | undefined): void {
    selectedTarget = value;
    selectedLevel = undefined;
  }

  function handleLevelChange(value: string | undefined): void {
    selectedLevel = value;
  }

  function handleStart(): void {
    if (selectedList) {
      onSelect(selectedList.listName);
    }
  }

  function formatLanguage(code: string): string {
    return LANGUAGE_LABELS[code] || code.charAt(0).toUpperCase() + code.slice(1);
  }

  function formatLevel(level: string): string {
    return LEVEL_LABELS[level] || level.toUpperCase();
  }
</script>

<div class="selector-container">
  {#if loading}
    <div class="loading-state">
      <div class="skeleton-row">
        <div class="skeleton-shimmer skeleton-label"></div>
        <div class="skeleton-shimmer skeleton-select"></div>
      </div>
      <div class="skeleton-row">
        <div class="skeleton-shimmer skeleton-label"></div>
        <div class="skeleton-shimmer skeleton-select"></div>
      </div>
      <div class="skeleton-row">
        <div class="skeleton-shimmer skeleton-label"></div>
        <div class="skeleton-shimmer skeleton-select"></div>
      </div>
    </div>
  {:else}
    <div class="selector-grid">
      <div class="selector-row">
        <div class="selector-label">
          <Languages size={18} class="label-icon" />
          <span>I speak</span>
        </div>
        <Select type="single" value={selectedSource} onValueChange={handleSourceChange}>
          <SelectTrigger class="selector-trigger">
            {#if selectedSource}
              <span>{formatLanguage(selectedSource)}</span>
            {:else}
              <span class="placeholder">Select language</span>
            {/if}
          </SelectTrigger>
          <SelectContent>
            {#each sourceLanguages as lang (lang)}
              <SelectItem value={lang}>{formatLanguage(lang)}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <div class="selector-row" class:disabled={!selectedSource}>
        <div class="selector-label">
          <BookOpen size={18} class="label-icon" />
          <span>I learn</span>
        </div>
        <Select
          type="single"
          value={selectedTarget}
          onValueChange={handleTargetChange}
          disabled={!selectedSource}
        >
          <SelectTrigger class="selector-trigger">
            {#if selectedTarget}
              <span>{formatLanguage(selectedTarget)}</span>
            {:else}
              <span class="placeholder">Select language</span>
            {/if}
          </SelectTrigger>
          <SelectContent>
            {#each targetLanguages as lang (lang)}
              <SelectItem value={lang}>{formatLanguage(lang)}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <div class="selector-row" class:disabled={!selectedTarget}>
        <div class="selector-label">
          <GraduationCap size={18} class="label-icon" />
          <span>Level</span>
        </div>
        <Select
          type="single"
          value={selectedLevel}
          onValueChange={handleLevelChange}
          disabled={!selectedTarget}
        >
          <SelectTrigger class="selector-trigger">
            {#if selectedLevel}
              <span>{formatLevel(selectedLevel)}</span>
            {:else}
              <span class="placeholder">Select level</span>
            {/if}
          </SelectTrigger>
          <SelectContent>
            {#each availableLevels as { level, wordCount } (level)}
              <SelectItem value={level}>
                <span class="level-option">
                  <span>{formatLevel(level)}</span>
                  <span class="word-count">{wordCount} words</span>
                </span>
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>
    </div>

    {#if selectedList}
      <div class="start-section">
        <Button size="default" class="start-button" onclick={handleStart}>
          <Play size={18} />
          <span>Start Learning</span>
        </Button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .selector-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .selector-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .selector-row {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: center;
    gap: var(--spacing-md);
    transition: opacity var(--transition-speed) ease;
  }

  @media (width <= 480px) {
    .selector-row {
      grid-template-columns: 1fr;
      gap: var(--spacing-xs);
    }
  }

  .selector-row.disabled {
    opacity: 0.5;
  }

  .selector-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    white-space: nowrap;
  }

  .selector-label :global(.label-icon) {
    color: var(--color-primary);
    flex-shrink: 0;
  }

  :global(.selector-trigger) {
    width: 100%;
    justify-content: flex-start !important;
    min-height: var(--touch-target-min);
  }

  .placeholder {
    color: var(--color-muted-foreground);
  }

  .level-option {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: var(--spacing-md);
  }

  .word-count {
    font-size: var(--font-size-sm);
    color: var(--color-muted-foreground);
  }

  .start-section {
    display: flex;
    justify-content: center;
    padding-top: var(--spacing-sm);
  }

  :global(.start-button) {
    min-width: 180px;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .skeleton-row {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: var(--spacing-md);
    align-items: center;
  }

  @media (width <= 480px) {
    .skeleton-row {
      grid-template-columns: 1fr;
      gap: var(--spacing-xs);
    }
  }

  .skeleton-label {
    height: 20px;
    border-radius: var(--radius-sm);
  }

  .skeleton-select {
    height: var(--touch-target-min);
    border-radius: var(--radius-md);
  }
</style>
