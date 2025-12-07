<script lang="ts">
  import { onMount, tick, onDestroy } from 'svelte';
  import { authStore, quizStore, levelWordLists, safeStorage } from '../stores';
  import type { SubmissionResult, QuizQuestion } from '@lingua-quiz/core';
  import type { QuizFeedback } from '../api-types';
  import { LEVEL_CONFIG } from '../lib/config/levelConfig';
  import { ttsService } from '../lib/services/ttsService';
  import { STORAGE_KEYS } from '../lib/constants';
  import { toast } from 'svelte-sonner';
  import { extractErrorMessage } from '../lib/utils/error';

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
  import ErrorDisplay from '../components/ErrorDisplay.svelte';
  import QuizSkeleton from '../components/quiz/QuizSkeleton.svelte';
  import BottomNav from '../components/quiz/BottomNav.svelte';
  import { Languages } from 'lucide-svelte';

  let userAnswer = $state('');
  let showProgress = $state(true);
  let answerInputRef: ReturnType<typeof AnswerInput> | undefined = $state();
  let feedback = $state<SubmissionResult | QuizFeedback | null>(null);
  let usageExamples = $state<{ source: string; target: string } | null>(null);
  let isSubmitting = $state(false);
  let questionForFeedback = $state<QuizQuestion | null>(null);

  let showLevelAnimation = $state(false);
  let isLevelUp = $state(true);
  let liveStatus = $state('');
  let loadError = $state<string | null>(null);
  let lastSelectedQuiz = $state<string | null>(null);

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

  function resetQuizSession() {
    feedback = null;
    usageExamples = null;
    userAnswer = '';
    questionForFeedback = null;
  }

  function toggleFold(levelId: string) {
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

  async function handleQuizSelect(quiz: string): Promise<void> {
    quizStore.reset();
    resetQuizSession();
    liveStatus = 'Loading quiz...';

    if (!quiz) {
      liveStatus = '';
      return;
    }

    lastSelectedQuiz = quiz;

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
      feedback = { message: extractErrorMessage(error, 'Failed to start quiz. Please try again.'), isSuccess: false } as QuizFeedback;
    }
    liveStatus = '';
  }

  function retryLastOperation(): void {
    if (lastSelectedQuiz && !selectedQuiz) {
      handleQuizSelect(lastSelectedQuiz);
    }
  }

  async function handleBackToMenu(): Promise<void> {
    if ($authStore.token && $quizStore.quizManager) {
      liveStatus = 'Saving progress...';
      try {
        await quizStore.saveAndCleanup($authStore.token);
      } catch (error) {
        console.error('Failed to save progress before returning to menu:', error);
        toast.error('Could not save all progress.');
      } finally {
        liveStatus = '';
      }
    }

    quizStore.reset();
    resetQuizSession();
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
      feedback = { message: extractErrorMessage(error, 'Error submitting answer.'), isSuccess: false } as QuizFeedback;
    } finally {
      isSubmitting = false;
      liveStatus = '';
    }
  }

  let showLogoutConfirm = $state(false);

  function handleLogoutClick(): void {
    if (quizStore.hasPendingChanges()) {
      showLogoutConfirm = true;
    } else {
      performLogout();
    }
  }

  async function performLogout(): Promise<void> {
    showLogoutConfirm = false;
    await authStore.logout();
  }

  function cancelLogout(): void {
    showLogoutConfirm = false;
  }

  async function handleDeleteAccount(): Promise<void> {
    try {
      await authStore.deleteAccount();
      toast.success('Your account has been deleted');
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Failed to delete account'));
    }
  }

  async function loadWordLists(): Promise<void> {
    if (!$authStore.token) return;

    loadError = null;
    try {
      await quizStore.loadWordLists($authStore.token);
    } catch (error) {
      console.error('Failed to load word lists:', error);
      loadError = extractErrorMessage(error, 'Failed to load quizzes');
    }
  }

  onMount(() => {
    quizStore.setSaveErrorCallback((message) => {
      toast.error(message);
    });

    ttsService.setErrorCallback((message) => {
      toast.error(message);
    });

    (async () => {
      if ($authStore.token) {
        await quizStore.restorePending($authStore.token);
        await ttsService.initializeLanguages($authStore.token);
        await loadWordLists();
      }
      await tick();
      answerInputRef?.focus();
    })().catch((error) => {
      console.error('Failed to initialize quiz:', error);
    });
  });

  onMount(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if ($authStore.token && quizStore.hasPendingChanges()) {
        quizStore.flushImmediately($authStore.token, true);
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleVisibilityChange = (): void => {
      if (document.hidden && $authStore.token && $quizStore.quizManager) {
        quizStore.flushImmediately($authStore.token, true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });

  onDestroy(() => {
    ttsService.destroy();
  });

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !isSubmitting && feedback && currentQuestion) {
      resetQuizSession();
      tick().then(() => answerInputRef?.focus());
    }
  }

  function handleClick(e: MouseEvent): void {
    if (currentQuestion && answerInputRef && !isSubmitting) {
      const target = e.target as HTMLElement;
      const isClickOnInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isClickOnButton = target.closest('button') !== null;
      const isClickOnLink = target.closest('a') !== null;

      if (!isClickOnInput && !isClickOnButton && !isClickOnLink) {
        tick().then(() => answerInputRef?.focus());
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} on:click={handleClick} />

<ErrorBoundary>
  {#key selectedQuiz}
    <main id="main-content" class="feed">
      {#if liveStatus}
        <div class="bg-muted text-foreground border border-border rounded-md px-3 py-2 mb-3 text-sm">{liveStatus}</div>
      {/if}

      <FeedCard title={null}>
        {#if !selectedQuiz}
          <header class="flex-align-center gap-sm mb-md">
            <h1 class="m-0 text-primary text-xl"><Languages size={28} /> LinguaQuiz</h1>
          </header>
        {/if}
        <div class="stack">
          <QuizHeader
            {wordLists}
            {selectedQuiz}
            {loading}
            onSelect={handleQuizSelect}
            onBackToMenu={handleBackToMenu}
          />
          {#if loadError && !selectedQuiz}
            <ErrorDisplay
              message={loadError}
              onRetry={loadWordLists}
              retryLabel="Reload quizzes"
            />
          {:else if !selectedQuiz}
            <div class="text-center p-xl">
              <div class="welcome-icon mb-md">🎯</div>
              <h3>Welcome to LinguaQuiz!</h3>
              <p class="muted mb-lg">Start learning with these features:</p>
              <div class="stack">
                <a
                  href="https://github.com/nikolay-e/lingua-quiz/blob/main/CLAUDE.md#learning-algorithm"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="feature feature-link"
                  aria-label="Adaptive learning algorithm (opens in new window)"
                >
                  ✨ Adaptive learning algorithm
                </a>
                <div class="feature">📊 Track your progress in real-time</div>
                <div class="feature">🎧 Listen to pronunciations</div>
              </div>
            </div>
          {/if}
        </div>
      </FeedCard>

      {#if selectedQuiz && loading && !currentQuestion}
        <QuizSkeleton />
      {:else}
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
              <p class="mt-2 text-muted-foreground text-sm">{liveStatus}</p>
            {/if}
          </FeedCard>
        {/if}

        {#if feedback}
          <FeedCard dense>
            <FeedbackDisplay
              {feedback}
              {usageExamples}
              {questionForFeedback}
              onRetry={retryLastOperation}
            />
          </FeedCard>
        {/if}

        {#if selectedQuiz && showProgress}
          <FeedCard>
            <LearningProgress
              selectedQuiz={selectedQuiz || undefined}
              {currentLevel}
              {sourceLanguage}
              {targetLanguage}
              levelWordLists={$levelWordLists}
              {foldedLists}
              onToggleFold={toggleFold}
            />
          </FeedCard>
        {/if}
      {/if}

      <FeedCard dense>
        <UserActions
          {username}
          showDeleteOption={!selectedQuiz}
          onLogout={handleLogoutClick}
          onDeleteAccount={handleDeleteAccount}
          showLogoutConfirm={showLogoutConfirm}
          onLogoutConfirm={performLogout}
          onLogoutCancel={cancelLogout}
        />
      </FeedCard>
    </main>
  {/key}

  <LevelChangeAnimation
    bind:isVisible={showLevelAnimation}
    {isLevelUp}
    onComplete={() => (showLevelAnimation = false)}
  />

  <div class="sr-only" aria-live="polite">
    {liveStatus}
  </div>

  <BottomNav
    {selectedQuiz}
    {showProgress}
    onBackToMenu={handleBackToMenu}
    onToggleProgress={() => (showProgress = !showProgress)}
    onLogout={handleLogoutClick}
  />
</ErrorBoundary>

<style>
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
</style>
