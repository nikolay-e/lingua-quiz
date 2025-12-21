<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore } from '$stores';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';
  import { ArrowLeft, KeyRound, Trash2, Eye, EyeOff, Loader2, LogOut, User } from 'lucide-svelte';
  import ConfirmDialog from '$components/ConfirmDialog.svelte';
  import { extractErrorMessage } from '$lib/utils/error';
  import api from '$src/api';

  const auth = $derived($authStore);

  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let showCurrentPassword = $state(false);
  let showNewPassword = $state(false);
  let showConfirmPassword = $state(false);
  let isChangingPassword = $state(false);
  let showDeleteConfirm = $state(false);
  let isDeletingAccount = $state(false);

  const passwordRequirements = $derived([
    { label: 'At least 8 characters', valid: newPassword.length >= 8 },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase letter', valid: /[a-z]/.test(newPassword) },
    { label: 'Contains number', valid: /\d/.test(newPassword) },
    { label: 'Contains special character', valid: /[!@#$%^&*()_\-+=[\]{}`;:'",.\\|<>/?~]/.test(newPassword) },
  ]);

  const isPasswordValid = $derived(passwordRequirements.every((r) => r.valid));
  const doPasswordsMatch = $derived(newPassword === confirmPassword && confirmPassword.length > 0);
  const canSubmitPassword = $derived(
    currentPassword.length > 0 && isPasswordValid && doPasswordsMatch && !isChangingPassword,
  );

  async function handleChangePassword(): Promise<void> {
    if (!canSubmitPassword || !auth.token) return;

    isChangingPassword = true;
    try {
      await api.changePassword(auth.token, currentPassword, newPassword);
      toast.success('Password changed successfully');
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Failed to change password'));
    } finally {
      isChangingPassword = false;
    }
  }

  async function handleDeleteAccount(): Promise<void> {
    showDeleteConfirm = false;
    isDeletingAccount = true;
    try {
      await authStore.deleteAccount();
      toast.success('Your account has been deleted');
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Failed to delete account'));
      isDeletingAccount = false;
    }
  }

  async function navigateBack(): Promise<void> {
    await goto('/');
  }

  async function handleLogout(): Promise<void> {
    await authStore.logout();
  }
</script>

<main class="settings-page">
  <div class="settings-container">
    <header class="settings-header">
      <Button
        variant="ghost"
        size="sm"
        onclick={navigateBack}
        class="back-button"
      >
        <ArrowLeft size={18} />
        <span>Back</span>
      </Button>
      <h1>Settings</h1>
      <p class="text-muted-foreground">Manage your account settings</p>
    </header>

    <section class="settings-section">
      <Card.Root>
        <Card.Header>
          <div class="section-title">
            <User size={20} class="section-icon" />
            <Card.Title>Account</Card.Title>
          </div>
          <Card.Description>Logged in as {auth.username}</Card.Description>
        </Card.Header>
        <Card.Content>
          <Button variant="outline" onclick={handleLogout} class="w-full">
            <LogOut size={16} />
            <span>Log Out</span>
          </Button>
        </Card.Content>
      </Card.Root>
    </section>

    <section class="settings-section">
      <Card.Root>
        <Card.Header>
          <div class="section-title">
            <KeyRound size={20} class="section-icon" />
            <Card.Title>Change Password</Card.Title>
          </div>
          <Card.Description>Update your password to keep your account secure</Card.Description>
        </Card.Header>
        <Card.Content>
          <form class="password-form" onsubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
            <div class="form-field">
              <Label for="current-password">Current Password</Label>
              <div class="password-input-wrapper">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  bind:value={currentPassword}
                  autocomplete="current-password"
                  disabled={isChangingPassword}
                />
                <button
                  type="button"
                  class="toggle-password"
                  onclick={() => (showCurrentPassword = !showCurrentPassword)}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {#if showCurrentPassword}
                    <EyeOff size={18} />
                  {:else}
                    <Eye size={18} />
                  {/if}
                </button>
              </div>
            </div>

            <div class="form-field">
              <Label for="new-password">New Password</Label>
              <div class="password-input-wrapper">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  bind:value={newPassword}
                  autocomplete="new-password"
                  disabled={isChangingPassword}
                  aria-invalid={newPassword.length > 0 && !isPasswordValid}
                />
                <button
                  type="button"
                  class="toggle-password"
                  onclick={() => (showNewPassword = !showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {#if showNewPassword}
                    <EyeOff size={18} />
                  {:else}
                    <Eye size={18} />
                  {/if}
                </button>
              </div>
              {#if newPassword.length > 0}
                <ul class="password-requirements">
                  {#each passwordRequirements as req (req.label)}
                    <li class:valid={req.valid}>
                      <span class="requirement-icon">{req.valid ? '✓' : '○'}</span>
                      <span>{req.label}</span>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>

            <div class="form-field">
              <Label for="confirm-password">Confirm New Password</Label>
              <div class="password-input-wrapper">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  bind:value={confirmPassword}
                  autocomplete="new-password"
                  disabled={isChangingPassword}
                  aria-invalid={confirmPassword.length > 0 && !doPasswordsMatch}
                />
                <button
                  type="button"
                  class="toggle-password"
                  onclick={() => (showConfirmPassword = !showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {#if showConfirmPassword}
                    <EyeOff size={18} />
                  {:else}
                    <Eye size={18} />
                  {/if}
                </button>
              </div>
              {#if confirmPassword.length > 0 && !doPasswordsMatch}
                <p class="error-message">Passwords do not match</p>
              {/if}
            </div>

            <Button type="submit" disabled={!canSubmitPassword} class="submit-button">
              {#if isChangingPassword}
                <Loader2 size={16} class="animate-spin" />
                <span>Changing...</span>
              {:else}
                <span>Change Password</span>
              {/if}
            </Button>
          </form>
        </Card.Content>
      </Card.Root>
    </section>

    <section class="settings-section danger-zone">
      <Card.Root class="danger-card">
        <Card.Header>
          <div class="section-title">
            <Trash2 size={20} class="section-icon danger" />
            <Card.Title>Danger Zone</Card.Title>
          </div>
          <Card.Description>Irreversible actions that affect your account</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="danger-action">
            <div class="danger-info">
              <h4>Delete Account</h4>
              <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
            </div>
            <Button
              variant="destructive"
              onclick={() => (showDeleteConfirm = true)}
              disabled={isDeletingAccount}
            >
              {#if isDeletingAccount}
                <Loader2 size={16} class="animate-spin" />
                <span>Deleting...</span>
              {:else}
                <Trash2 size={16} />
                <span>Delete Account</span>
              {/if}
            </Button>
          </div>
        </Card.Content>
      </Card.Root>
    </section>
  </div>

  {#if showDeleteConfirm}
    <ConfirmDialog
      open={showDeleteConfirm}
      title="Delete account?"
      description="This will permanently delete your account and all your learning progress.
        This action cannot be undone."
      confirmLabel="Delete Account"
      onconfirm={handleDeleteAccount}
      oncancel={() => (showDeleteConfirm = false)}
      titleId="delete-account-title"
      descId="delete-account-desc"
    />
  {/if}
</main>

<style>
  .settings-page {
    min-height: 100vh;
    background-color: var(--color-background);
    padding: var(--spacing-md);
  }

  .settings-container {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .settings-header {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .settings-header h1 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text);
    margin: 0;
  }

  :global(.back-button) {
    align-self: flex-start;
    margin-bottom: var(--spacing-xs);
  }

  .settings-section {
    display: flex;
    flex-direction: column;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  :global(.section-icon) {
    color: var(--color-primary);
  }

  :global(.section-icon.danger) {
    color: var(--color-error);
  }

  .password-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .password-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .password-input-wrapper :global(input) {
    padding-right: 44px;
  }

  .toggle-password {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: var(--color-muted-foreground);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toggle-password:hover {
    color: var(--color-text);
  }

  .password-requirements {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--font-size-sm);
  }

  .password-requirements li {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-muted-foreground);
    transition: color var(--transition-speed);
  }

  .password-requirements li.valid {
    color: var(--color-success);
  }

  .requirement-icon {
    font-size: 12px;
  }

  .error-message {
    font-size: var(--font-size-sm);
    color: var(--color-error);
    margin: 0;
  }

  :global(.submit-button) {
    align-self: flex-start;
    margin-top: var(--spacing-xs);
  }

  .danger-zone {
    margin-top: var(--spacing-lg);
  }

  :global(.danger-card) {
    border-color: var(--color-error);
  }

  .danger-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-md);
  }

  @media (width <= 480px) {
    .danger-action {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .danger-info h4 {
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--spacing-xs) 0;
  }

  .danger-info p {
    font-size: var(--font-size-sm);
    color: var(--color-muted-foreground);
    margin: 0;
  }
</style>
