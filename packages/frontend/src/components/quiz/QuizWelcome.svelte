<script lang="ts">
  import { Languages } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
</script>

<header class="flex-align-center gap-sm mb-md">
  <h1 class="m-0 text-primary text-xl flex-align-center gap-xs"><Languages size={28} /> LinguaQuiz</h1>
</header>

<div class="text-center p-xl">
  <h3>{$_('quiz.welcome')}</h3>
  <p class="muted mb-lg">{$_('quiz.welcomeDesc')}</p>
  <div class="stack mb-lg">
    <a
      href="https://github.com/nikolay-e/lingua-quiz/blob/main/CLAUDE.md#learning-algorithm"
      target="_blank"
      rel="noopener noreferrer"
      class="feature feature-link"
      aria-label="{$_('quiz.featureAdaptive')} (opens in new window)"
    >{$_('quiz.featureAdaptive')}</a>
    <div class="feature">{$_('quiz.featureProgress')}</div>
    <div class="feature">{$_('quiz.featureTTS')}</div>
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
