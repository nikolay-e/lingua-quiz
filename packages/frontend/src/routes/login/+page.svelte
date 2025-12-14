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
  import { LogIn, Loader2 } from 'lucide-svelte';
  import { extractErrorMessage } from '$lib/utils/error';

  let username = $state('');
  let password = $state('');
  let message = $state('');
  let isLoading = $state(false);
  let hasError = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    isLoading = true;
    message = '';
    hasError = false;

    try {
      await authStore.login(username, password);
      message = 'Login successful!';
      await goto('/');
    } catch (error: unknown) {
      message = extractErrorMessage(error, 'Login failed. Please try again.');
      hasError = true;
    } finally {
      isLoading = false;
    }
  }

  async function navigateToRegister() {
    await goto('/register');
  }
</script>

<AuthLayout>
  <h2 id="login-title" data-testid="login-title">Sign In</h2>
  <form
onsubmit={handleSubmit}
aria-busy={isLoading}
aria-labelledby="login-title"
class="form-compact">
    <div class="input-group">
      <Label for="username">Username</Label>
      <Input
        type="text"
        id="username"
        bind:value={username}
        required
        aria-required="true"
        aria-invalid={hasError}
        disabled={isLoading}
        autocomplete="username"
      />
    </div>

    <PasswordInput
      bind:value={password}
      disabled={isLoading}
      id="password"
      label="Password"
      autocomplete="current-password"
      invalid={hasError}
    />

    <Button type="submit" disabled={isLoading} class="w-full">
      {#if isLoading}
        <Loader2 size={16} class="animate-spin" />
        <span>Signing in...</span>
      {:else}
        <LogIn size={16} />
        <span>Sign In</span>
      {/if}
    </Button>
  </form>

  <AuthMessage {message} variant={message.includes('successful') ? 'success' : 'error'} id="login-message" />

  <AuthNavLink
    text="Need an account?"
    linkText="Register here"
    onClick={navigateToRegister}
  />
</AuthLayout>
