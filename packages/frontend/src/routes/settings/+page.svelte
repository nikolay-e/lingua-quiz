<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore, themeStore } from '$stores';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select';
  import { ArrowLeft, KeyRound, Trash2, Eye, EyeOff, Loader2, LogOut, User, Globe, Sun, Moon, Monitor } from 'lucide-svelte';
  import ConfirmDialog from '$components/ConfirmDialog.svelte';
  import { extractErrorMessage } from '$lib/utils/error';
  import { _, locale } from 'svelte-i18n';
  import { setLocale, getSupportedLocales, LOCALE_NAMES, type SupportedLocale } from '$lib/i18n';
  import { THEME_MODES, type ThemeMode } from '$lib/constants';
  import api from '$src/api';

  const auth = $derived($authStore);
  const currentLocale = $derived($locale as SupportedLocale);
  const theme = $derived($themeStore);
  const currentThemeMode = $derived(theme.mode);

  const THEME_MODE_NAMES: Record<ThemeMode, string> = {
    [THEME_MODES.LIGHT]: 'settings.themeLight',
    [THEME_MODES.DARK]: 'settings.themeDark',
    [THEME_MODES.SYSTEM]: 'settings.themeSystem',
  };

  const THEME_MODES_LIST: ThemeMode[] = [THEME_MODES.SYSTEM, THEME_MODES.LIGHT, THEME_MODES.DARK];

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
    { labelKey: 'settings.reqLength', valid: newPassword.length >= 8 },
    { labelKey: 'settings.reqUppercase', valid: /[A-Z]/.test(newPassword) },
    { labelKey: 'settings.reqLowercase', valid: /[a-z]/.test(newPassword) },
    { labelKey: 'settings.reqNumber', valid: /\d/.test(newPassword) },
    { labelKey: 'settings.reqSpecial', valid: /[!@#$%^&*()_\-+=[\]{}`;:'",.\\|<>/?~]/.test(newPassword) },
  ]);

  const isPasswordValid = $derived(passwordRequirements.every((r) => r.valid));
  const doPasswordsMatch = $derived(newPassword === confirmPassword && confirmPassword.length > 0);
  const canSubmitPassword = $derived(
    currentPassword.length > 0 && isPasswordValid && doPasswordsMatch && !isChangingPassword,
  );

  function handleLanguageChange(value: string | undefined): void {
    if (value) {
      setLocale(value as SupportedLocale);
    }
  }

  function handleThemeChange(value: string | undefined): void {
    if (value === THEME_MODES.LIGHT || value === THEME_MODES.DARK || value === THEME_MODES.SYSTEM) {
      themeStore.setMode(value);
    }
  }

  async function handleChangePassword(): Promise<void> {
    if (!canSubmitPassword || !auth.token) return;

    isChangingPassword = true;
    try {
      await api.changePassword(auth.token, currentPassword, newPassword);
      toast.success($_('settings.passwordChanged'));
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, $_('settings.passwordChangeFailed')));
    } finally {
      isChangingPassword = false;
    }
  }

  async function handleDeleteAccount(): Promise<void> {
    showDeleteConfirm = false;
    isDeletingAccount = true;
    try {
      await authStore.deleteAccount();
      toast.success($_('settings.accountDeleted'));
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, $_('settings.deleteAccountFailed')));
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
        <span>{$_('nav.back')}</span>
      </Button>
      <h1>{$_('settings.title')}</h1>
      <p class="text-muted-foreground">{$_('settings.subtitle')}</p>
    </header>

    <section class="settings-section">
      <Card.Root>
        <Card.Header>
          <div class="section-title">
            <User size={20} class="section-icon" />
            <Card.Title>{$_('settings.account')}</Card.Title>
          </div>
          <Card.Description>{$_('settings.loggedInAs', { values: { username: auth.username } })}</Card.Description>
        </Card.Header>
        <Card.Content>
          <Button variant="outline" onclick={handleLogout} class="w-full">
            <LogOut size={16} />
            <span>{$_('settings.logOut')}</span>
          </Button>
        </Card.Content>
      </Card.Root>
    </section>

    <section class="settings-section">
      <Card.Root>
        <Card.Header>
          <div class="section-title">
            <Globe size={20} class="section-icon" />
            <Card.Title>{$_('settings.language')}</Card.Title>
          </div>
          <Card.Description>{$_('settings.languageDesc')}</Card.Description>
        </Card.Header>
        <Card.Content>
          <Select type="single" value={currentLocale} onValueChange={handleLanguageChange}>
            <SelectTrigger class="w-full">
              <span>{LOCALE_NAMES[currentLocale]}</span>
            </SelectTrigger>
            <SelectContent>
              {#each getSupportedLocales() as loc (loc)}
                <SelectItem value={loc}>{LOCALE_NAMES[loc]}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </Card.Content>
      </Card.Root>
    </section>

    <section class="settings-section">
      <Card.Root>
        <Card.Header>
          <div class="section-title">
            {#if currentThemeMode === THEME_MODES.DARK}
              <Moon size={20} class="section-icon" />
            {:else if currentThemeMode === THEME_MODES.LIGHT}
              <Sun size={20} class="section-icon" />
            {:else}
              <Monitor size={20} class="section-icon" />
            {/if}
            <Card.Title>{$_('settings.theme')}</Card.Title>
          </div>
          <Card.Description>{$_('settings.themeDesc')}</Card.Description>
        </Card.Header>
        <Card.Content>
          <Select type="single" value={currentThemeMode} onValueChange={handleThemeChange}>
            <SelectTrigger class="w-full">
              <span>{$_(THEME_MODE_NAMES[currentThemeMode])}</span>
            </SelectTrigger>
            <SelectContent>
              {#each THEME_MODES_LIST as mode (mode)}
                <SelectItem value={mode}>{$_(THEME_MODE_NAMES[mode])}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </Card.Content>
      </Card.Root>
    </section>

    <section class="settings-section">
      <Card.Root>
        <Card.Header>
          <div class="section-title">
            <KeyRound size={20} class="section-icon" />
            <Card.Title>{$_('settings.changePassword')}</Card.Title>
          </div>
          <Card.Description>{$_('settings.changePasswordDesc')}</Card.Description>
        </Card.Header>
        <Card.Content>
          <form class="password-form" onsubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
            <div class="form-field">
              <Label for="current-password">{$_('settings.currentPassword')}</Label>
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
                  aria-label={showCurrentPassword ? $_('settings.hidePassword') : $_('settings.showPassword')}
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
              <Label for="new-password">{$_('settings.newPassword')}</Label>
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
                  aria-label={showNewPassword ? $_('settings.hidePassword') : $_('settings.showPassword')}
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
                  {#each passwordRequirements as req (req.labelKey)}
                    <li class:valid={req.valid}>
                      <span class="requirement-icon">{req.valid ? '✓' : '○'}</span>
                      <span>{$_(req.labelKey)}</span>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>

            <div class="form-field">
              <Label for="confirm-password">{$_('settings.confirmPassword')}</Label>
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
                  aria-label={showConfirmPassword ? $_('settings.hidePassword') : $_('settings.showPassword')}
                >
                  {#if showConfirmPassword}
                    <EyeOff size={18} />
                  {:else}
                    <Eye size={18} />
                  {/if}
                </button>
              </div>
              {#if confirmPassword.length > 0 && !doPasswordsMatch}
                <p class="error-message">{$_('settings.passwordMismatch')}</p>
              {/if}
            </div>

            <Button type="submit" disabled={!canSubmitPassword} class="submit-button">
              {#if isChangingPassword}
                <Loader2 size={16} class="animate-spin" />
                <span>{$_('settings.changing')}</span>
              {:else}
                <span>{$_('settings.changePassword')}</span>
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
            <Card.Title>{$_('settings.dangerZone')}</Card.Title>
          </div>
          <Card.Description>{$_('settings.dangerZoneDesc')}</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="danger-action">
            <div class="danger-info">
              <h4>{$_('settings.deleteAccount')}</h4>
              <p>{$_('settings.deleteAccountDesc')}</p>
            </div>
            <Button
              variant="destructive"
              onclick={() => (showDeleteConfirm = true)}
              disabled={isDeletingAccount}
            >
              {#if isDeletingAccount}
                <Loader2 size={16} class="animate-spin" />
                <span>{$_('settings.deleting')}</span>
              {:else}
                <Trash2 size={16} />
                <span>{$_('settings.deleteAccount')}</span>
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
      title={$_('settings.deleteConfirmTitle')}
      description={$_('settings.deleteConfirmDesc')}
      confirmLabel={$_('settings.deleteAccount')}
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
