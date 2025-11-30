<script lang="ts">
  import { onMount, tick, onDestroy } from 'svelte';
  import { authStore, quizStore, levelWordLists, safeStorage } from '../stores';
  import type { SubmissionResult, QuizQuestion } from '@lingua-quiz/core';
  import type { QuizFeedback } from '../api-types';
  import { LEVEL_CONFIG } from '../lib/config/levelConfig';
  import { ttsService } from '../lib/services/ttsService';
  import { STORAGE_KEYS } from '../lib/constants';
  import { toast } from 'svelte-sonner';

  import QuizHeader from '../components/quiz/QuizHeader.svelte';
  import QuestionDisplay from '../components/quiz/QuestionDisplay.svelte';
  import FeedbackDisplay from '../components/quiz/FeedbackDisplay.svelte';
  import LearningProgress from '../components/quiz/LearningProgress.svelte';
  import FeedCard from '../components/FeedCard.svelte';
  import LevelChangeAnimation from '../components/quiz/LevelChangeAnimation.svelte';
  import AnswerInput from '../components/quiz/AnswerInput.svelte';
  import TTSButton from '../components/quiz/TTSButton.svelte';
  import UserActions from '../components/quiz/UserActions.svelte';
  import ErrorBoundary from '../components/ErrorBoundary.svelte';

  let userAnswer = $state('');
  let answerInputRef: ReturnType<typeof AnswerInput> | undefined = $state();
  let feedback = $state<SubmissionResult | QuizFeedback | null>(null);
  let usageExamples = $state<{ source: string; target: string } | null>(null);
  let isSubmitting = $state(false);
  let questionForFeedback = $state<QuizQuestion | null>(null);

  let showLevelAnimation = $state(false);
  let isLevelUp = $state(true);
  let liveStatus = $state('');

  const initialFoldedLists: Record<string, boolean> = {};
  LEVEL_CONFIG.forEach(level => {
    initialFoldedLists[level.id] = true;
  });

  const savedFoldStates = safeStorage.getItem(STORAGE_KEYS.FOLDED_LISTS);
  if (savedFoldStates) {
    try {
      const saved = JSON.parse(savedFoldStates);
      Object.keys(initialFoldedLists).forEach(key => {
        if (key in saved) {
          initialFoldedLists[key] = saved[key];
        }
      });
    } catch {
    // Ignore parsing errors for corrupted localStorage
    }
  }

  const foldedLists = $state<Record<string, boolean>>(initialFoldedLists);

  function toggleFold(event: CustomEvent<{ levelId: string }>) {
    const {levelId} = event.detail;
    foldedLists[levelId] = !foldedLists[levelId];
    safeStorage.setItem(STORAGE_KEYS.FOLDED_LISTS, JSON.stringify(foldedLists));
  }

  const wordLists = $derived($quizStore.wordLists);
  const selectedQuiz = $derived($quizStore.selectedQuiz);
  const currentQuestion = $derived($quizStore.currentQuestion);
  const loading = $derived($quizStore.loading);
  const username = $derived($authStore.username);

  const direction = $derived(currentQuestion?.direction ?? 'normal');
  const sourceLanguage = $derived(currentQuestion?.sourceLanguage ?? $quizStore.quizManager?.getState().translations[0]?.sourceLanguage ?? '');
  const targetLanguage = $derived(currentQuestion?.targetLanguage ?? $quizStore.quizManager?.getState().translations[0]?.targetLanguage ?? '');

  let currentLevel = $state('LEVEL_1');
  let lastCurrentLevel = 'LEVEL_1';

  $effect(() => {
    const newLevel = $quizStore.quizManager?.getState().currentLevel || 'LEVEL_1';
    if (newLevel !== lastCurrentLevel) {
      lastCurrentLevel = newLevel;
      currentLevel = newLevel;
    }
  });

  const currentLanguage = $derived(direction === 'normal' ? sourceLanguage : targetLanguage);

  $effect(() => {
    if (answerInputRef && currentQuestion) {
      answerInputRef.focus();
    }
  });

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
      answerInputRef?.focus();
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
        answerInputRef?.focus();
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

  async function logout(): Promise<void> {
    await authStore.logout();
  }

  async function handleDeleteAccount(): Promise<void> {
    try {
      await authStore.deleteAccount();
      toast.success('Your account has been deleted');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete account';
      toast.error(message);
    }
  }

  onMount(() => {
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
      answerInputRef?.focus();
    })();
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

<ErrorBoundary>
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
            {#if currentQuestion}
              <TTSButton
                token={$authStore.token!}
                text={currentQuestion.questionText}
                language={currentLanguage}
              />
            {/if}
          </svelte:fragment>
          <QuestionDisplay {currentQuestion} />
        </FeedCard>
      {/if}

      {#if currentQuestion}
        <FeedCard dense>
          <AnswerInput
            bind:this={answerInputRef}
            value={userAnswer}
            disabled={isSubmitting}
            onSubmit={submitAnswer}
            onValueChange={(v) => (userAnswer = v)}
          />
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
        <UserActions
          {username}
          showDeleteOption={!selectedQuiz}
          onLogout={logout}
          onDeleteAccount={handleDeleteAccount}
        />
      </FeedCard>
    </main>
  {/key}

  <LevelChangeAnimation
    bind:isVisible={showLevelAnimation}
    {isLevelUp}
    on:complete={() => (showLevelAnimation = false)}
  />

  <div class="sr-only" aria-live="polite">
    {liveStatus}
  </div>
</ErrorBoundary>

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
