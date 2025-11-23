<script lang="ts">
  import { authStore, quizStore, themeStore } from './stores';
  import Login from './views/Login.svelte';
  import Register from './views/Register.svelte';
  import Quiz from './views/Quiz.svelte';
  import Admin from './views/Admin.svelte';
  import EnvironmentInfo from './components/EnvironmentInfo.svelte';
  import { PAGES, type PageType } from './lib/constants';
  import { Toaster } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';

  let currentPage = $state<PageType>(PAGES.QUIZ);

  const auth = $derived($authStore);
  // Subscribe to theme store to trigger re-renders on theme change
  $effect(() => void $themeStore);

  $effect(() => {
    if (!auth.isAuthenticated) {
      quizStore.reset();
      if (currentPage !== PAGES.LOGIN && currentPage !== PAGES.REGISTER) {
        currentPage = PAGES.LOGIN;
      }
    } else if (currentPage === PAGES.LOGIN || currentPage === PAGES.REGISTER) {
      currentPage = PAGES.QUIZ;
    }
  });

  function handleNavigation(event: CustomEvent<{ page: PageType }>) {
    currentPage = event.detail.page;
  }

  function navigateToQuiz() {
    currentPage = PAGES.QUIZ;
  }

  function navigateToAdmin() {
    if (auth.isAdmin) {
      currentPage = PAGES.ADMIN;
    }
  }
</script>

{#key auth.isAuthenticated}
  {#if auth.isAuthenticated}
    {#if currentPage === PAGES.ADMIN && auth.isAdmin}
      <div class="admin-nav">
        <Button variant="outline" onclick={navigateToQuiz}>
          <svg
            class="mr-2 size-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Quiz
        </Button>
      </div>
      <Admin />
    {:else}
      {#if auth.isAdmin}
        <div class="admin-nav">
          <Button variant="secondary" onclick={navigateToAdmin}>
            <svg
              class="mr-2 size-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><!-- eslint-disable-line max-len -->
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin Panel
          </Button>
        </div>
      {/if}
      <Quiz />
    {/if}
  {:else}
    {#key currentPage}
      {#if currentPage === PAGES.LOGIN}
        <Login on:navigate={handleNavigation} />
      {:else if currentPage === PAGES.REGISTER}
        <Register on:navigate={handleNavigation} />
      {/if}
    {/key}
  {/if}
{/key}

<Toaster richColors position="top-right" />
<EnvironmentInfo />

<style>
  .admin-nav {
    position: fixed;
    top: max(var(--spacing-sm), env(safe-area-inset-top, 0px));
    right: max(var(--spacing-sm), env(safe-area-inset-right, 0px));
    z-index: 1000;
  }
</style>
