<script lang="ts">
  import { Languages, BrainCircuit, TrendingUp, Volume2 } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
</script>

<header class="flex-align-center gap-sm mb-md">
  <h1 class="m-0 text-primary text-xl flex-align-center gap-xs"><Languages size={28} /> LinguaQuiz</h1>
</header>

<div class="text-center p-lg">
  <h3>{$_('quiz.welcome')}</h3>
  <p class="muted mb-md">{$_('quiz.welcomeDesc')}</p>
  <div class="stack stack-sm mb-md">
    <a
      href="https://github.com/nikolay-e/lingua-quiz/blob/main/CLAUDE.md#learning-algorithm"
      target="_blank"
      rel="noopener noreferrer"
      class="feature feature-link"
      aria-label="{$_('quiz.featureAdaptive')} (opens in new window)"
    >
      <span class="feature-icon"><BrainCircuit size={20} /></span>
      {$_('quiz.featureAdaptive')}
    </a>
    <div class="feature">
      <span class="feature-icon"><TrendingUp size={20} /></span>
      {$_('quiz.featureProgress')}
    </div>
    <div class="feature">
      <span class="feature-icon"><Volume2 size={20} /></span>
      {$_('quiz.featureTTS')}
    </div>
  </div>
</div>

<style>
  .feature-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: var(--spacing-sm);
    transition: transform var(--transition-speed) ease;
  }

  .feature:hover .feature-icon {
    transform: scale(1.15);
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
</style>
