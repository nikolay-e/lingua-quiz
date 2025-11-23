<script lang="ts">
  import { onMount, tick, onDestroy } from 'svelte';
  import { authStore, quizStore, levelWordLists, safeStorage } from '../stores';
  import type { SubmissionResult, QuizQuestion } from '@lingua-quiz/core';
  import type { QuizFeedback } from '../api-types';
  import { LEVEL_CONFIG } from '../lib/config/levelConfig';
  import { ttsService } from '../lib/services/ttsService';
  import { STORAGE_KEYS } from '../lib/constants';
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';

  import QuizHeader from '../components/quiz/QuizHeader.svelte';
  import QuestionDisplay from '../components/quiz/QuestionDisplay.svelte';
  import FeedbackDisplay from '../components/quiz/FeedbackDisplay.svelte';
  import LearningProgress from '../components/quiz/LearningProgress.svelte';
  import FeedCard from '../components/FeedCard.svelte';
  import LevelChangeAnimation from '../components/quiz/LevelChangeAnimation.svelte';

  let userAnswer: string = '';
  let answerInput: HTMLInputElement;
  let feedback: SubmissionResult | QuizFeedback | null = null;
  let usageExamples: { source: string; target: string } | null = null;
  let isSubmitting: boolean = false;
  let questionForFeedback: QuizQuestion | null = null;

  let showLevelAnimation = false;
  let isLevelUp = true;
  let showDeleteConfirm = false;
  let liveStatus = '';

  let ttsState: import('../lib/services/ttsService').TTSState = { isAvailable: false, supportedLanguages: [], isPlaying: false };

  const foldedLists: Record<string, boolean> = {};

  LEVEL_CONFIG.forEach(level => {
    foldedLists[level.id] = true;
  });

  const savedFoldStates = safeStorage.getItem(STORAGE_KEYS.FOLDED_LISTS);
  if (savedFoldStates) {
    try {
      const saved = JSON.parse(savedFoldStates);
      Object.keys(foldedLists).forEach(key => {
        if (key in saved) {
          foldedLists[key] = saved[key];
        }
      });
    } catch {
    // Ignore parsing errors for corrupted localStorage
    }
  }

  function toggleFold(event: CustomEvent<{ levelId: string }>) {
    const {levelId} = event.detail;
    foldedLists[levelId] = !foldedLists[levelId];
    safeStorage.setItem(STORAGE_KEYS.FOLDED_LISTS, JSON.stringify(foldedLists));
  }

  // eslint-disable-next-line prefer-destructuring
  $: wordLists = $quizStore.wordLists;
  // eslint-disable-next-line prefer-destructuring
  $: selectedQuiz = $quizStore.selectedQuiz;
  // eslint-disable-next-line prefer-destructuring
  $: currentQuestion = $quizStore.currentQuestion;
  // eslint-disable-next-line prefer-destructuring
  $: loading = $quizStore.loading;
  // eslint-disable-next-line prefer-destructuring
  $: username = $authStore.username;

  $: direction = currentQuestion?.direction ?? 'normal';
  $: sourceLanguage = currentQuestion?.sourceLanguage ?? $quizStore.quizManager?.getState().translations[0]?.sourceLanguage ?? '';
  $: targetLanguage = currentQuestion?.targetLanguage ?? $quizStore.quizManager?.getState().translations[0]?.targetLanguage ?? '';

  let currentLevel: string = 'LEVEL_1';
  let lastCurrentLevel: string = 'LEVEL_1';

  $: {
    const newLevel = $quizStore.quizManager?.getState().currentLevel || 'LEVEL_1';
    if (newLevel !== lastCurrentLevel) {
      lastCurrentLevel = newLevel;
      currentLevel = newLevel;
    }
  }

  $: currentLanguage = direction === 'normal' ? sourceLanguage : targetLanguage;
  $: canUseTTS = currentQuestion && ttsService.canUseTTS(currentLanguage);

  $: if (answerInput && currentQuestion) {
    answerInput.focus();
  }

  async function handleQuizSelect(event: CustomEvent<{ quiz: string }>): Promise<void> {
    const {quiz} = event.detail;

    quizStore.reset();
    feedback = null;
    usageExamples = null;
    userAnswer = '';
    questionForFeedback = null;
    liveStatus = 'Loading quiz...';

    if (!quiz) {
      liveStatus = '';
      return;
    }

    try {
      await quizStore.startQuiz($authStore.token!, quiz);
      const question: QuizQuestion | null = await quizStore.getNextQuestion();
      if (!question) {
        feedback = { message: 'No questions available for this quiz.', isSuccess: false } as QuizFeedback;
      }
      await tick();
      if (answerInput) answerInput.focus();
    } catch (error: unknown) {
      console.error('Failed to start quiz:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start quiz. Please try again.';
      feedback = { message: errorMessage, isSuccess: false } as QuizFeedback;
    }
    liveStatus = '';
  }

  function handleBackToMenu(): void {
    if ($authStore.token) {
      quizStore.saveAndCleanup($authStore.token).catch((error) => {
        console.error('Failed to save progress before returning to menu:', error);
      });
    }

    quizStore.reset();
    feedback = null;
    usageExamples = null;
    userAnswer = '';
    questionForFeedback = null;
  }

  async function submitAnswer(): Promise<void> {
    if (!currentQuestion || isSubmitting) return;

    isSubmitting = true;
    questionForFeedback = currentQuestion;
    liveStatus = 'Submitting answer...';

    try {
      const result = await quizStore.submitAnswer($authStore.token!, userAnswer);

      if (result) {
        feedback = result;
        if ('translation' in result && result.translation) {
          usageExamples = {
            source: result.translation.sourceUsageExample || '',
            target: result.translation.targetUsageExample || '',
          };
        } else {
          usageExamples = null;
        }

        if ('levelChange' in result && result.levelChange) {
          const fromLevel = parseInt(result.levelChange.from.replace('LEVEL_', ''));
          const toLevel = parseInt(result.levelChange.to.replace('LEVEL_', ''));
          isLevelUp = toLevel > fromLevel;
          showLevelAnimation = true;
        }

        userAnswer = '';

        quizStore.getNextQuestion();

        await tick();
        if (answerInput) answerInput.focus();
      }
    } catch (error: unknown) {
      console.error('Error submitting answer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error submitting answer.';
      feedback = { message: errorMessage, isSuccess: false } as QuizFeedback;
    } finally {
      isSubmitting = false;
      liveStatus = '';
    }
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !isSubmitting) {
      submitAnswer();
    }
  }

  async function logout(): Promise<void> {
    await authStore.logout();
  }

  async function handleDeleteAccount(): Promise<void> {
    showDeleteConfirm = false;
    try {
      await authStore.deleteAccount();
      toast.success('Your account has been deleted');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete account';
      toast.error(message);
    }
  }

  onMount(() => {
    const unsubscribeTTS = ttsService.subscribe((state) => {
      ttsState = state;
    });

    (async () => {
      if ($authStore.token) {
        await ttsService.initializeLanguages($authStore.token);
        try {
          await quizStore.loadWordLists($authStore.token);
        } catch (error) {
          console.error('Failed to load word lists:', error);
        }
      }
      await tick();
      if (answerInput) answerInput.focus();
    })();

    return () => {
      unsubscribeTTS();
    };
  });

  onMount(() => {
    const handleBeforeUnload = async () => {
      if ($authStore.token && $quizStore.quizManager) {
        await quizStore.saveAndCleanup($authStore.token);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });

  onDestroy(() => {
    ttsService.destroy();
  });
</script>

{#key selectedQuiz}
  <main class="feed">
    {#if liveStatus}
      <div class="status-banner" aria-live="polite">{liveStatus}</div>
    {/if}

    <FeedCard title={selectedQuiz ?? null}>
      {#if !selectedQuiz}
        <header class="flex-align-center gap-sm mb-md">
          <h1 class="logo"><i class="fas fa-language"></i> LinguaQuiz</h1>
        </header>
      {/if}
      <div class="stack">
        <QuizHeader
          {wordLists}
          {selectedQuiz}
          {loading}
          on:select={handleQuizSelect}
          on:backToMenu={handleBackToMenu}
        />
        {#if !selectedQuiz}
          <div class="text-center p-xl">
            <div class="welcome-icon mb-md">🎯</div>
            <h3>Welcome to LinguaQuiz!</h3>
            <p class="muted mb-lg">Start learning with these features:</p>
            <div class="stack">
              <a href="https://github.com/nikolay-e/lingua-quiz/blob/main/CLAUDE.md#learning-algorithm" target="_blank" class="feature feature-link">
                ✨ Adaptive learning algorithm
              </a>
              <div class="feature">📊 Track your progress in real-time</div>
              <div class="feature">🎧 Listen to pronunciations</div>
            </div>
          </div>
        {/if}
      </div>
    </FeedCard>

    {#if selectedQuiz}
      <FeedCard dense title="Translate">
        <svelte:fragment slot="headerAction">
          {#if canUseTTS}
            <Button
              variant="outline"
              size="sm"
              class={ttsState.isPlaying ? 'speaking' : ''}
              onclick={() =>
                currentQuestion &&
                  ttsService.playTTS($authStore.token!, currentQuestion.questionText, currentLanguage)}
              disabled={ttsState.isPlaying}
              aria-label="Listen to pronunciation"
            >
              <i class="fas fa-volume-up"></i>
              <span>{ttsState.isPlaying ? 'Playing…' : 'Listen'}</span>
            </Button>
          {:else}
            <span class="tts-muted" aria-live="polite">TTS unavailable for {currentLanguage || 'this language'}</span>
          {/if}
        </svelte:fragment>
        <QuestionDisplay {currentQuestion} />
      </FeedCard>
    {/if}

    {#if currentQuestion}
      <FeedCard dense>
        <div class="actions">
          <input
            type="text"
            bind:this={answerInput}
            bind:value={userAnswer}
            on:keydown={handleKeydown}
            placeholder="Type your answer…"
            disabled={isSubmitting}
            aria-describedby="word"
          />
          <Button
            type="button"
            variant="default"
            onclick={submitAnswer}
            disabled={isSubmitting}
          >
            <i class="fas fa-paper-plane"></i> {isSubmitting ? 'Submitting…' : 'Submit'}
          </Button>
        </div>
        {#if liveStatus && isSubmitting}
          <p class="status-hint" aria-live="polite">{liveStatus}</p>
        {/if}
      </FeedCard>
    {/if}

    {#if feedback}
      <FeedCard dense>
        <FeedbackDisplay
          {feedback}
          {usageExamples}
          {questionForFeedback}
        />
      </FeedCard>
    {/if}

    {#if selectedQuiz}
      <FeedCard>
        <LearningProgress
          selectedQuiz={selectedQuiz || undefined}
          {currentLevel}
          {sourceLanguage}
          {targetLanguage}
          levelWordLists={$levelWordLists}
          {foldedLists}
          on:toggleFold={toggleFold}
        />
      </FeedCard>
    {/if}

    <FeedCard dense>
      <div class="actions">
        <Button variant="outline" onclick={logout} class="w-full">
          <i class="fas fa-sign-out-alt"></i> Logout ({username})
        </Button>
        {#if !selectedQuiz}
          {#if showDeleteConfirm}
            <div class="delete-confirm">
              <span>Delete account?</span>
              <Button size="sm" variant="destructive" onclick={handleDeleteAccount}>
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onclick={() => (showDeleteConfirm = false)}>
                Cancel
              </Button>
            </div>
          {:else}
            <Button variant="destructive" onclick={() => (showDeleteConfirm = true)} class="w-full">
              <i class="fas fa-trash-alt"></i> Delete Account
            </Button>
          {/if}
        {/if}
      </div>
    </FeedCard>
  </main>
{/key}

<LevelChangeAnimation
  bind:isVisible={showLevelAnimation}
  {isLevelUp}
  on:complete={() => showLevelAnimation = false}
/>

<div class="sr-only" aria-live="polite">
  {liveStatus}
</div>

<style>
  .logo {
    margin: 0;
    color: var(--primary-color);
    font-size: var(--font-size-xl);
  }

  .feature-link {
    text-decoration: none;
    color: inherit;
    transition: all var(--transition-speed) ease;
    cursor: pointer;

    &:hover {
      background-color: var(--primary-color);
      color: var(--color-primary-foreground);
      transform: translateY(-1px);
      box-shadow: var(--shadow-button-hover);
    }
  }

  .tts-muted {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .delete-confirm {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: var(--font-size-sm);
  }

  .status-banner {
    background: var(--color-muted);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-xs) var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    font-size: var(--font-size-sm);
  }

  .status-hint {
    margin-top: var(--spacing-xs);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }
</style>
