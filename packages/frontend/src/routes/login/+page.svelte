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
  import { _ } from 'svelte-i18n';

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
      message = $_('auth.loginSuccess');
      await goto('/');
    } catch (error: unknown) {
      message = extractErrorMessage(error, $_('auth.loginFailed'));
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
  <h2 id="login-title" data-testid="login-title">{$_('auth.signIn')}</h2>
  <form
onsubmit={handleSubmit}
aria-busy={isLoading}
aria-labelledby="login-title"
class="form-compact">
    <div class="input-group">
      <Label for="username">{$_('auth.username')}</Label>
      <Input
        type="text"
        id="username"
        bind:value={username}
        required
        aria-required="true"
        aria-invalid={hasError}
        disabled={isLoading}
        autocomplete="username"
        autofocus
      />
    </div>

    <PasswordInput
      bind:value={password}
      disabled={isLoading}
      id="password"
      label={$_('auth.password')}
      autocomplete="current-password"
      invalid={hasError}
    />

    <Button type="submit" disabled={isLoading} class="w-full">
      {#if isLoading}
        <Loader2 size={16} class="animate-spin" />
        <span>{$_('auth.signingIn')}</span>
      {:else}
        <LogIn size={16} />
        <span>{$_('auth.signIn')}</span>
      {/if}
    </Button>
  </form>

  <AuthMessage {message} variant={!hasError ? 'success' : 'error'} id="login-message" />

  <AuthNavLink
    text={$_('auth.needAccount')}
    linkText={$_('auth.registerHere')}
    onClick={navigateToRegister}
  />
</AuthLayout>
