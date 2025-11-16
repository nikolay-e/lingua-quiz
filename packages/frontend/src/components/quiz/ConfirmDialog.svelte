<script lang="ts">
  export let open = false;
  export let title = 'Confirm';
  export let message = 'Are you sure?';
  export let confirmText = 'Confirm';
  export let cancelText = 'Cancel';
  export let onConfirm: () => void = () => {};
  export let onCancel: () => void = () => {};

  let dialogElement: HTMLDialogElement;

  $: if (dialogElement) {
    if (open) {
      dialogElement.showModal();
    } else {
      dialogElement.close();
    }
  }

  function handleConfirm() {
    onConfirm();
    open = false;
  }

  function handleCancel() {
    onCancel();
    open = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogElement) {
      handleCancel();
    }
  }
</script>

<dialog
  bind:this={dialogElement}
  on:keydown={handleKeydown}
  on:click={handleBackdropClick}
  aria-labelledby="dialog-title"
  aria-describedby="dialog-message"
>
  <div class="dialog-content">
    <h2 id="dialog-title">{title}</h2>
    <p id="dialog-message">{message}</p>
    <div class="dialog-actions">
      <button type="button" class="cancel-btn" on:click={handleCancel}>
        {cancelText}
      </button>
      <button type="button" class="confirm-btn" on:click={handleConfirm}>
        {confirmText}
      </button>
    </div>
  </div>
</dialog>

<style>
  dialog {
    border: none;
    border-radius: var(--radius-lg);
    padding: 0;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 25%);
    background-color: var(--container-bg);
  }

  dialog::backdrop {
    background-color: rgb(0 0 0 / 50%);
    backdrop-filter: blur(4px);
  }

  dialog[open] {
    animation: dialog-open 0.2s ease-out;
  }

  @keyframes dialog-open {
    from {
      opacity: 0;
      transform: scale(0.95);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .dialog-content {
    padding: var(--spacing-lg);
  }

  h2 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-color);
  }

  p {
    margin: 0 0 var(--spacing-lg) 0;
    color: var(--text-color);
    line-height: 1.5;
  }

  .dialog-actions {
    display: flex;
    gap: var(--spacing-sm);
    justify-content: flex-end;
  }

  button {
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-speed) ease;
  }

  .cancel-btn {
    background-color: transparent;
    border: 1px solid var(--input-border-color);
    color: var(--text-color);
  }

  .cancel-btn:hover {
    background-color: var(--disabled-bg);
  }

  .confirm-btn {
    background-color: var(--primary-color);
    border: none;
    color: white;
  }

  .confirm-btn:hover {
    background-color: var(--primary-hover);
  }

  .confirm-btn:focus-visible,
  .cancel-btn:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
</style>
