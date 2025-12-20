<script lang="ts">
  import { onMount, tick, onDestroy } from 'svelte';
  import { authStore, quizStore, levelWordLists, uiPreferencesStore } from '$stores';
  import type { SubmissionResult, QuizQuestion, RevealResult } from '@lingua-quiz/core';
  import type { QuizFeedback } from '$src/api-types';
  import { ttsService } from '$lib/services/ttsService';
  import { toast } from 'svelte-sonner';
  import { extractErrorMessage } from '$lib/utils/error';
  import { logger } from '$lib/utils/logger';
  import {
    requestWakeLock,
    releaseWakeLock,
    reacquireWakeLockOnVisibilityChange,
  } from '$lib/pwa';

  import QuizHeader from '$components/quiz/QuizHeader.svelte';
  import QuestionDisplay from '$components/quiz/QuestionDisplay.svelte';
  import FeedbackDisplay from '$components/quiz/FeedbackDisplay.svelte';
  import UsageExamples from '$components/quiz/UsageExamples.svelte';
  import LearningProgress from '$components/quiz/LearningProgress.svelte';
  import FeedCard from '$components/FeedCard.svelte';
  import LevelChangeAnimation from '$components/quiz/LevelChangeAnimation.svelte';
  import AnswerInput from '$components/quiz/AnswerInput.svelte';
  import TTSButton from '$components/quiz/TTSButton.svelte';
  import UserActions from '$components/quiz/UserActions.svelte';
  import ErrorBoundary from '$components/ErrorBoundary.svelte';
  import ErrorDisplay from '$components/ErrorDisplay.svelte';
  import QuizSkeleton from '$components/quiz/QuizSkeleton.svelte';
  import QuizWelcome from '$components/quiz/QuizWelcome.svelte';

  let userAnswer = $state('');
  const showProgress = true;
  let answerInputRef: ReturnType<typeof AnswerInput> | undefined = $state();
  let feedback = $state<SubmissionResult | QuizFeedback | RevealResult | null>(null);
  let usageExamples = $state<{ source: string; target: string } | null>(null);
  let isSubmitting = $state(false);
  let questionForFeedback = $state<QuizQuestion | null>(null);

  let showLevelAnimation = $state(false);
  let isLevelUp = $state(true);
  let levelChangeFrom = $state<string | undefined>(undefined);
  let levelChangeTo = $state<string | undefined>(undefined);
  let loadError = $state<string | null>(null);
  let lastSelectedQuiz = $state<string | null>(null);
  let awaitingNextInput = $state(false);

  const foldedListsStore = uiPreferencesStore.foldedLists;
  const foldedLists = $derived($foldedListsStore);

  function resetQuizSession(clearAnswer = true) {
    feedback = null;
    if (clearAnswer) userAnswer = '';
    questionForFeedback = null;
    awaitingNextInput = false;
  }

  function handleValueChange(v: string): void {
    if (awaitingNextInput) {
      feedback = null;
      questionForFeedback = null;
      awaitingNextInput = false;
    }
    userAnswer = v;
  }

  function handleSkip(): void {
    if (!currentQuestion || isSubmitting) return;
    questionForFeedback = currentQuestion;
    const result = quizStore.revealAnswer();
    if (result) {
      feedback = result;
      awaitingNextInput = true;
      usageExamples = {
        source: result.translation.sourceUsageExample || '',
        target: result.translation.targetUsageExample || '',
      };
      userAnswer = '';
      quizStore.getNextQuestion();
      tick().then(() => answerInputRef?.focus());
    }
  }

  function toggleFold(levelId: string) {
    uiPreferencesStore.toggleFold(levelId);
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

    if (!quiz) return;

    lastSelectedQuiz = quiz;

    try {
      await quizStore.startQuiz($authStore.token!, quiz);
      const question: QuizQuestion | null = await quizStore.getNextQuestion();
      if (!question) {
        feedback = { message: 'No questions available for this quiz.', isSuccess: false } as QuizFeedback;
      }
      await tick();
      answerInputRef?.focus();

      await requestWakeLock();
    } catch (error: unknown) {
      logger.error('Failed to start quiz:', error);
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
      } catch (error: unknown) {
        logger.error('Failed to save progress before returning to menu:', error);
        toast.error('Could not save all progress.');
      }
    }
    quizStore.reset();
    resetQuizSession();

    await releaseWakeLock();
  }

  async function submitAnswer(): Promise<void> {
    if (!currentQuestion || isSubmitting) return;

    isSubmitting = true;
    questionForFeedback = currentQuestion;

    try {
      const result = await quizStore.submitAnswer($authStore.token!, userAnswer);

      if (result) {
        feedback = result;
        awaitingNextInput = true;
        if ('translation' in result && result.translation) {
          const hasExamples = result.translation.sourceUsageExample || result.translation.targetUsageExample;
          if (hasExamples) {
            usageExamples = {
              source: result.translation.sourceUsageExample || '',
              target: result.translation.targetUsageExample || '',
            };
          }
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
      logger.error('Error submitting answer:', error);
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
    } catch (error: unknown) {
      logger.error('Failed to load word lists:', error);
      loadError = extractErrorMessage(error, 'Failed to load quizzes');
    }
  }

  onMount(() => {
    // Set up error callbacks
    quizStore.setSaveErrorCallback((message) => {
      toast.error(message);
    });

    ttsService.setErrorCallback((message) => {
      toast.error(message);
    });

    // Initialize quiz data
    (async () => {
      if ($authStore.token) {
        await Promise.all([
          quizStore.restorePending($authStore.token),
          ttsService.initializeLanguages($authStore.token),
          loadWordLists(),
        ]);
      }
      await tick();
      answerInputRef?.focus();
    })().catch((error) => {
      logger.error('Failed to initialize quiz:', error);
    });

    // Set up event handlers for saving progress
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if ($authStore.token && quizStore.hasPendingChanges()) {
        quizStore.flushImmediately($authStore.token, true);
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleVisibilityChange = async (): Promise<void> => {
      if (document.hidden && $authStore.token && $quizStore.quizManager) {
        quizStore.flushImmediately($authStore.token, true);
      }

      if (!document.hidden && selectedQuiz) {
        await reacquireWakeLockOnVisibilityChange();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });

  onDestroy(() => {
    ttsService.destroy();
  });

</script>

<ErrorBoundary>
  <main id="main-content" class="feed">
      {#if !selectedQuiz}
        <FeedCard title={null}>
          <QuizWelcome />
        </FeedCard>
      {/if}

      <FeedCard title={null}>
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
            {#snippet headerAction()}
              {#if currentQuestion}
                <TTSButton
                  token={$authStore.token!}
                  text={currentQuestion.questionText}
                  language={currentLanguage}
                />
              {/if}
            {/snippet}
            <QuestionDisplay {currentQuestion} levelWordLists={$levelWordLists} />
          </FeedCard>
        {/if}

        {#if currentQuestion}
          <FeedCard dense>
            <AnswerInput
              bind:this={answerInputRef}
              value={userAnswer}
              disabled={isSubmitting}
              isLoading={isSubmitting}
              onSubmit={submitAnswer}
              onValueChange={handleValueChange}
              onSkip={handleSkip}
            />
            {#if feedback}
              <FeedbackDisplay
                {feedback}
                {questionForFeedback}
                onRetry={retryLastOperation}
              />
            {/if}
            <AnswerInput
              bind:this={answerInputRef}
              value={userAnswer}
              disabled={isSubmitting}
              isLoading={isSubmitting}
              onSubmit={submitAnswer}
              onValueChange={handleValueChange}
              onSkip={handleSkip}
            />
          </FeedCard>
        {/if}

        {#if selectedQuiz && usageExamples}
          <FeedCard dense>
            <UsageExamples examples={usageExamples} />
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

      {#if !selectedQuiz}
        <FeedCard dense>
          <UserActions
            {username}
            showDeleteOption={true}
            onLogout={handleLogoutClick}
            onDeleteAccount={handleDeleteAccount}
            showLogoutConfirm={showLogoutConfirm}
            onLogoutConfirm={performLogout}
            onLogoutCancel={cancelLogout}
          />
        </FeedCard>
      {/if}
    </main>

  <LevelChangeAnimation
    bind:isVisible={showLevelAnimation}
    {isLevelUp}
    fromLevel={levelChangeFrom}
    toLevel={levelChangeTo}
    onComplete={() => (showLevelAnimation = false)}
  />

</ErrorBoundary>
