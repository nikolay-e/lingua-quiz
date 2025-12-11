<script lang="ts">
  import { Languages } from 'lucide-svelte';
</script>

<header class="flex-align-center gap-sm mb-md">
  <h1 class="m-0 text-primary text-xl flex-align-center gap-xs"><Languages size={28} /> LinguaQuiz</h1>
</header>

<div class="text-center p-xl">
  <div class="welcome-icon mb-md">🎯</div>
  <h3>Welcome to LinguaQuiz!</h3>
  <p class="muted mb-lg">Start learning with these features:</p>
  <div class="stack mb-lg">
    <a
      href="https://github.com/nikolay-e/lingua-quiz/blob/main/CLAUDE.md#learning-algorithm"
      target="_blank"
      rel="noopener noreferrer"
      class="feature feature-link"
      aria-label="Adaptive learning algorithm (opens in new window)"
    >✨ Adaptive learning algorithm</a>
    <div class="feature">📊 Track your progress in real-time</div>
    <div class="feature">🎧 Listen to pronunciations</div>
  </div>
</div>

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
