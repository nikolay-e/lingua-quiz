<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore } from '$stores';
  import AuthLayout from '$components/AuthLayout.svelte';
  import PasswordInput from '$components/PasswordInput.svelte';
  import AuthMessage from '$components/AuthMessage.svelte';
  import AuthNavLink from '$components/AuthNavLink.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { Label } from '$lib/components/ui/label';
  import { UserPlus, Loader2 } from 'lucide-svelte';
  import { extractErrorMessage } from '$lib/utils/error';

  interface PasswordRequirement {
    id: string;
    label: string;
    test: (pwd: string) => boolean;
  }

  interface PasswordValidation extends PasswordRequirement {
    valid: boolean;
  }

  let username = $state('');
  let password = $state('');
  let message = $state('');
  let isLoading = $state(false);

  const passwordRequirements: PasswordRequirement[] = [
    { id: 'length', label: 'At least 8 characters long', test: (pwd: string) => pwd.length >= 8 },
    { id: 'uppercase', label: 'Contains at least one uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { id: 'lowercase', label: 'Contains at least one lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
    { id: 'number', label: 'Contains at least one number', test: (pwd: string) => /\d/.test(pwd) },
    { id: 'special', label: 'Contains at least one special character', test: (pwd: string) => /[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/.test(pwd) },
  ];

  const passwordValidation = $derived(
    passwordRequirements.map((req) => ({
      ...req,
      valid: req.test(password),
    })) as PasswordValidation[],
  );

  const isPasswordValid = $derived(passwordValidation.every((req: PasswordValidation) => req.valid));

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!isPasswordValid) {
      message = 'Please meet all password requirements';
      return;
    }

    isLoading = true;
    message = '';

    try {
      await authStore.register(username, password);
      message = 'Registration successful! Redirecting...';
      await goto('/');
    } catch (error: unknown) {
      message = extractErrorMessage(error, 'Registration failed. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  async function navigateToLogin() {
    await goto('/login');
  }
</script>

<AuthLayout>
  <h2 id="register-title">Create Account</h2>
  <form
onsubmit={handleSubmit}
aria-busy={isLoading}
aria-labelledby="register-title"
class="form-compact">
    <div class="input-group">
      <Label for="register-username">Username</Label>
      <Input
        type="text"
        id="register-username"
        bind:value={username}
        required
        aria-required="true"
        disabled={isLoading}
        autocomplete="username"
      />
    </div>

    <PasswordInput
      bind:value={password}
      disabled={isLoading}
      id="register-password"
      label="Password"
      autocomplete="new-password"
      invalid={password.length > 0 && !isPasswordValid}
    />

    {#if password}
      <div class="password-requirements">
        <div class="password-requirements-title">Password Requirements:</div>
        <div class="requirements-list">
          {#each passwordValidation as req (req.label)}
            <div class="requirement {req.valid ? 'valid' : ''}">
              <span class="requirement-icon text-sm {req.valid ? 'valid' : ''}">
                {req.valid ? '✓' : '○'}
              </span>
              <span>{req.label}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <Button type="submit" disabled={!isPasswordValid || isLoading} class="w-full">
      {#if isLoading}
        <Loader2 size={16} class="animate-spin" />
        <span>Creating account...</span>
      {:else}
        <UserPlus size={16} />
        <span>Create Account</span>
      {/if}
    </Button>
  </form>

  <AuthMessage {message} variant={message.includes('successful') ? 'success' : 'error'} id="register-message" />

  <AuthNavLink
    text="Already have an account?"
    linkText="Sign in here"
    onClick={navigateToLogin}
  />
</AuthLayout>

<style>
  .password-requirements {
    background-color: var(--container-bg);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    margin-block: var(--spacing-sm) var(--spacing-md);
    box-shadow: var(--shadow-sm);
  }

  .password-requirements-title {
    margin-block-end: var(--spacing-xs);
    font-weight: var(--font-weight-bold);
  }

  .requirements-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .requirement {
    opacity: 0.8;
    transition: opacity var(--transition-speed) ease;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .requirement:hover {
    opacity: 1;
  }

  .requirement-icon {
    transition:
      transform var(--transition-speed-fast) ease,
      color var(--transition-speed-fast) ease;
    color: var(--input-border-color);
  }

  .requirement.valid {
    color: var(--success-color);
    opacity: 1;
  }

  .requirement-icon.valid {
    color: var(--success-color);
    transform: scale(1.1);
  }
</style>
