<script lang="ts">
  const environment = import.meta.env.VITE_APP_ENVIRONMENT || 'development';
  const version = import.meta.env.VITE_APP_VERSION || 'dev';
</script>

<div class="environment-info text-sm">
  <span
    class="env-label"
    class:production={environment === 'production'}
    class:staging={environment === 'staging'}>
    {environment}
  </span>
  <span class="version">v{version}</span>
</div>

<style>
  .environment-info {
    display: flex;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-sm);
    font-family: monospace;
    opacity: 0.6;
    transition: opacity var(--transition-speed-fast);
  }

  .environment-info:hover {
    opacity: 1;
  }

  .env-label,
  .version {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    background: var(--color-muted);
    color: var(--color-foreground);
  }

  .env-label.production {
    background: var(--color-success);
    color: var(--color-primary-foreground);
  }

  .env-label.staging {
    background: var(--color-secondary);
    color: var(--color-secondary-foreground);
  }

  .version {
    background: var(--color-accent);
  }
</style>
