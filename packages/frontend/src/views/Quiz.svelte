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
  import QuizWelcome from '../components/quiz/QuizWelcome.svelte';

  let userAnswer = $state('');
  let showProgress = $state(true);
  let answerInputRef: ReturnType<typeof AnswerInput> | undefined = $state();
  let feedback = $state<SubmissionResult | QuizFeedback | null>(null);
  let usageExamples = $state<{ source: string; target: string } | null>(null);
  let isSubmitting = $state(false);
  let questionForFeedback = $state<QuizQuestion | null>(null);

  let showLevelAnimation = $state(false);
  let isLevelUp = $state(true);
  let levelChangeFrom = $state<string | undefined>(undefined);
  let levelChangeTo = $state<string | undefined>(undefined);
  let loadError = $state<string | null>(null);
  let lastSelectedQuiz = $state<string | null>(null);
  let questionNumber = $state(0);
  let totalQuestions = $state(0);

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

  function handleNextQuestion(): void {
    resetQuizSession();
    questionNumber++;
    tick().then(() => answerInputRef?.focus());
  }

  async function handleSkip(): Promise<void> {
    if (!currentQuestion || isSubmitting) return;
    questionForFeedback = currentQuestion;
    const result = await quizStore.submitAnswer($authStore.token!, '');
    if (result) {
      feedback = result;
      if ('translation' in result && result.translation) {
        usageExamples = {
          source: result.translation.sourceUsageExample || '',
          target: result.translation.targetUsageExample || '',
        };
      }
      userAnswer = '';
      quizStore.getNextQuestion();
    }
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
    questionNumber = 0;
    totalQuestions = 0;

    if (!quiz) return;

    lastSelectedQuiz = quiz;

    try {
      await quizStore.startQuiz($authStore.token!, quiz);
      const state = $quizStore.quizManager?.getState();
      totalQuestions = state?.translations?.length ?? 0;
      questionNumber = 1;
      const question: QuizQuestion | null = await quizStore.getNextQuestion();
      if (!question) {
        feedback = { message: 'No questions available for this quiz.', isSuccess: false } as QuizFeedback;
      }
      await tick();
      answerInputRef?.focus();
    } catch (error: unknown) {
      console.error('Failed to start quiz:', error);
      feedback = {
        message: extractErrorMessage(error, 'Failed to start quiz. Please try again.'),
        isSuccess: false,
      } as QuizFeedback;
    }
  }

  function retryLastOperation(): void {
    if (lastSelectedQuiz && !selectedQuiz) {
      handleQuizSelect(lastSelectedQuiz);
    }
  }

  async function handleBackToMenu(): Promise<void> {
    if ($authStore.token && $quizStore.quizManager) {
      try {
        await quizStore.saveAndCleanup($authStore.token);
      } catch (error) {
        console.error('Failed to save progress before returning to menu:', error);
        toast.error('Could not save all progress.');
      }
    }
    quizStore.reset();
    resetQuizSession();
  }

  async function submitAnswer(): Promise<void> {
    if (!currentQuestion || isSubmitting) return;

    isSubmitting = true;
    questionForFeedback = currentQuestion;

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
          const fromNum = parseInt(result.levelChange.from.replace('LEVEL_', ''));
          const toNum = parseInt(result.levelChange.to.replace('LEVEL_', ''));
          isLevelUp = toNum > fromNum;
          levelChangeFrom = result.levelChange.from;
          levelChangeTo = result.levelChange.to;
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
      handleNextQuestion();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<ErrorBoundary>
  <main id="main-content" class="feed">
      <FeedCard title={null}>
        {#if !selectedQuiz}
          <QuizWelcome />
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
            <QuestionDisplay {currentQuestion} {questionNumber} {totalQuestions} />
          </FeedCard>
        {/if}

        {#if currentQuestion && !feedback}
          <FeedCard dense>
            <AnswerInput
              bind:this={answerInputRef}
              value={userAnswer}
              disabled={isSubmitting}
              isLoading={isSubmitting}
              onSubmit={submitAnswer}
              onValueChange={(v) => (userAnswer = v)}
              onSkip={handleSkip}
            />
          </FeedCard>
        {/if}

        {#if feedback}
          <FeedCard dense>
            <FeedbackDisplay
              {feedback}
              {usageExamples}
              {questionForFeedback}
              onRetry={retryLastOperation}
              onNext={handleNextQuestion}
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

  <LevelChangeAnimation
    bind:isVisible={showLevelAnimation}
    {isLevelUp}
    fromLevel={levelChangeFrom}
    toLevel={levelChangeTo}
    onComplete={() => (showLevelAnimation = false)}
  />

  <BottomNav
    {selectedQuiz}
    {showProgress}
    onBackToMenu={handleBackToMenu}
    onToggleProgress={() => (showProgress = !showProgress)}
    onLogout={handleLogoutClick}
  />
</ErrorBoundary>
