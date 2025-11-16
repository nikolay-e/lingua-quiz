<script lang="ts">
  export let totalQuestions: number = 0;
  export let answeredQuestions: number = 0;
  export let correctAnswers: number = 0;
  export let currentLevel: number = 0;
  export let maxLevel: number = 5;

  $: progressPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  $: accuracyPercentage = answeredQuestions > 0 ? (correctAnswers / answeredQuestions) * 100 : 0;
</script>

<div class="session-stats" role="region" aria-label="Session Statistics">
  <div class="stat-item">
    <label for="session-progress" class="stat-label">Session Progress</label>
    <progress
      id="session-progress"
      value={answeredQuestions}
      max={totalQuestions}
      aria-label="Quiz progress: {answeredQuestions} of {totalQuestions} questions answered"
    >
      {answeredQuestions} of {totalQuestions}
    </progress>
    <span class="stat-value">{Math.round(progressPercentage)}%</span>
  </div>

  <div class="stat-item">
    <label for="accuracy-meter" class="stat-label">Accuracy</label>
    <meter
      id="accuracy-meter"
      min="0"
      low="50"
      optimum="100"
      high="80"
      max="100"
      value={accuracyPercentage}
      aria-label="Accuracy: {Math.round(accuracyPercentage)}%"
    >
      {Math.round(accuracyPercentage)}%
    </meter>
    <span class="stat-value">{Math.round(accuracyPercentage)}%</span>
  </div>

  <div class="stat-item">
    <label for="mastery-meter" class="stat-label">Mastery Level</label>
    <meter
      id="mastery-meter"
      min="0"
      low="1"
      optimum="5"
      high="4"
      max={maxLevel}
      value={currentLevel}
      aria-label="Current mastery level: {currentLevel} of {maxLevel}"
    >
      Level {currentLevel}/{maxLevel}
    </meter>
    <span class="stat-value">Level {currentLevel}</span>
  </div>
</div>

<style>
  .session-stats {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--container-bg);
    border-radius: var(--radius-lg);
    border: 1px solid var(--input-border-color);
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .stat-label {
    flex: 0 0 120px;
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-color);
  }

  progress,
  meter {
    flex: 1;
    height: 20px;
    border-radius: var(--radius-sm);
  }

  progress {
    appearance: none;
    background-color: var(--disabled-bg);
  }

  progress::-webkit-progress-bar {
    background-color: var(--disabled-bg);
    border-radius: var(--radius-sm);
  }

  progress::-webkit-progress-value {
    background-color: var(--primary-color);
    border-radius: var(--radius-sm);
    transition: width var(--transition-speed) ease;
  }

  progress::-moz-progress-bar {
    background-color: var(--primary-color);
    border-radius: var(--radius-sm);
  }

  meter {
    appearance: none;
  }

  meter::-webkit-meter-bar {
    background-color: var(--disabled-bg);
    border-radius: var(--radius-sm);
  }

  meter::-webkit-meter-optimum-value {
    background-color: var(--success-color);
    border-radius: var(--radius-sm);
  }

  meter::-webkit-meter-suboptimum-value {
    background-color: var(--secondary-color);
    border-radius: var(--radius-sm);
  }

  meter::-webkit-meter-even-less-good-value {
    background-color: var(--error-color);
    border-radius: var(--radius-sm);
  }

  .stat-value {
    flex: 0 0 60px;
    text-align: right;
    font-weight: 600;
    color: var(--primary-color);
    font-size: var(--font-size-sm);
  }
</style>
