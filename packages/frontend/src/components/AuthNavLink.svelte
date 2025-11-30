<script lang="ts">
  interface Props {
    text: string;
    linkText: string;
    onClick: () => void;
  }

  const { text, linkText, onClick }: Props = $props();
</script>

<div class="auth-link">
  <p>{text}</p>
  <button type="button" onclick={onClick} class="link-button">{linkText}</button>
</div>

<style>
  .auth-link {
    margin-block-start: var(--spacing-lg);
    text-align: center;
    color: var(--text-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);

    p {
      margin: 0;
    }
  }

  .link-button {
    background: none;
    border: none;
    color: var(--primary-color);
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    margin: 0;
    font-size: inherit;
    width: auto;

    &:hover {
      color: color-mix(in oklch, var(--primary-color) 70%, black);
      background: none;
    }
  }
</style>
