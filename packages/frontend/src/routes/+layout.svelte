<script lang="ts">
  import type { Snippet } from 'svelte';
  import { beforeNavigate, goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore, quizStore, themeStore } from '$stores';
  import EnvironmentInfo from '$components/EnvironmentInfo.svelte';
  import { Toaster } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import '$src/app.css';

  interface Props {
    children: Snippet;
  }

  const { children }: Props = $props();

  const auth = $derived($authStore);
  const currentPath = $derived($page.url.pathname);
  const isAdminPage = $derived(currentPath === '/admin');
  const isQuizPage = $derived(currentPath === '/' || currentPath === '/quiz');

  $effect(() => void $themeStore);

  // Auth guard via beforeNavigate
  beforeNavigate(({ to, cancel }) => {
    const protectedRoutes = ['/', '/quiz', '/admin'];
    const publicRoutes = ['/login', '/register'];
    const targetPath = to?.url.pathname;

    if (!auth.isAuthenticated && targetPath && protectedRoutes.includes(targetPath)) {
      cancel();

      goto('/login');
      return;
    }

    // Redirect authenticated users from login/register
    if (auth.isAuthenticated && targetPath && publicRoutes.includes(targetPath)) {
      cancel();

      goto('/');
      return;
    }

    // Admin guard
    if (targetPath === '/admin' && !auth.isAdmin) {
      cancel();

      goto('/');
    }
  });

  // Reset quiz when logging out
  $effect(() => {
    if (!auth.isAuthenticated) {
      quizStore.reset();
    }
  });

  // Initial auth check - redirect to login if not authenticated
  $effect(() => {
    const protectedRoutes = ['/', '/quiz', '/admin'];
    const publicRoutes = ['/login', '/register'];

    if (!auth.isAuthenticated && protectedRoutes.includes(currentPath)) {
      goto('/login');
    } else if (auth.isAuthenticated && publicRoutes.includes(currentPath)) {
      goto('/');
    } else if (currentPath === '/admin' && !auth.isAdmin) {
      goto('/');
    }
  });

  async function navigateToQuiz() {
    await goto('/');
  }

  async function navigateToAdmin() {
    if (auth.isAdmin) {
      await goto('/admin');
    }
  }
</script>

<div id="app">
  {#if auth.isAuthenticated && isAdminPage && auth.isAdmin}
    <div class="admin-nav">
      <Button variant="outline" onclick={navigateToQuiz}>
        <svg
          class="mr-2 size-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Quiz
      </Button>
    </div>
  {:else if auth.isAuthenticated && auth.isAdmin && isQuizPage}
    <div class="admin-nav">
      <Button variant="secondary" onclick={navigateToAdmin}>
        <svg
          class="mr-2 size-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true">
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

  {@render children()}
</div>

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
