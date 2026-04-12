import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, KeyRound, Trash2, Loader2, LogOut, User, Globe, Sun, Moon, Monitor } from 'lucide-react';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { useThemeStore } from '@features/settings/stores/theme.store';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Select } from '@shared/ui';
import { AppShell, ConfirmDialog, PasswordInput, useToast } from '@shared/components';
import { usePasswordValidation } from '@shared/hooks';
import { cn, extractErrorMessage, THEME_MODES, type ThemeMode } from '@shared/utils';
import { setLocale, getSupportedLocales, LOCALE_NAMES, type SupportedLocale } from '@shared/i18n';
import api from '@api';

const THEME_MODE_NAMES: Record<ThemeMode, string> = {
  [THEME_MODES.LIGHT]: 'settings.themeLight',
  [THEME_MODES.DARK]: 'settings.themeDark',
  [THEME_MODES.SYSTEM]: 'settings.themeSystem',
};

const THEME_MODES_LIST: ThemeMode[] = [THEME_MODES.SYSTEM, THEME_MODES.LIGHT, THEME_MODES.DARK];

export function SettingsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const token = useAuthStore((state) => state.token);
  const username = useAuthStore((state) => state.username);
  const logout = useAuthStore((state) => state.logout);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);

  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  const currentLocale = i18n.language as SupportedLocale;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const { requirements: passwordRequirements, isValid: isPasswordValid } = usePasswordValidation(
    newPassword,
    'settings',
  );
  const doPasswordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmitPassword = currentPassword.length > 0 && isPasswordValid && doPasswordsMatch && !isChangingPassword;

  const handleLanguageChange = useCallback((value: string) => {
    setLocale(value as SupportedLocale);
  }, []);

  const handleThemeChange = useCallback(
    (value: string) => {
      if (value === THEME_MODES.LIGHT || value === THEME_MODES.DARK || value === THEME_MODES.SYSTEM) {
        setMode(value);
      }
    },
    [setMode],
  );

  const handleChangePassword = async (): Promise<void> => {
    if (!canSubmitPassword || token === null) return;

    setIsChangingPassword(true);
    try {
      await api.changePassword(token, currentPassword, newPassword);
      toast.success(t('settings.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, t('settings.passwordChangeFailed')));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    setShowDeleteConfirm(false);
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      toast.success(t('settings.accountDeleted'));
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, t('settings.deleteAccountFailed')));
      setIsDeletingAccount(false);
    }
  };

  const handleLogout = (): void => {
    void logout();
  };

  const languageOptions = useMemo(
    () => getSupportedLocales().map((loc) => ({ value: loc, label: LOCALE_NAMES[loc] })),
    [],
  );

  const themeOptions = useMemo(
    () => THEME_MODES_LIST.map((themeMode) => ({ value: themeMode, label: t(THEME_MODE_NAMES[themeMode]) })),
    [t],
  );

  const getThemeIcon = () => {
    if (mode === THEME_MODES.DARK) return Moon;
    if (mode === THEME_MODES.LIGHT) return Sun;
    return Monitor;
  };
  const ThemeIcon = getThemeIcon();

  return (
    <>
      <AppShell maxWidth="xl">
        <header className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void navigate('/');
            }}
            className="self-start mb-2"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>{t('nav.back')}</span>
          </Button>
          <h1>{t('settings.title')}</h1>
          <p className="text-muted-foreground">{t('settings.subtitle')}</p>
        </header>

        <section>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User size={20} className="text-primary" />
                <CardTitle>{t('settings.account')}</CardTitle>
              </div>
              <CardDescription>{t('settings.loggedInAs', { username })}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleLogout} className="w-full">
                <LogOut size={16} />
                <span>{t('settings.logOut')}</span>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe size={20} className="text-primary" />
                <CardTitle>{t('settings.language')}</CardTitle>
              </div>
              <CardDescription>{t('settings.languageDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={currentLocale}
                onValueChange={handleLanguageChange}
                options={languageOptions}
                className="w-full"
                aria-label={t('settings.language')}
              />
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ThemeIcon size={20} className="text-primary" />
                <CardTitle>{t('settings.theme')}</CardTitle>
              </div>
              <CardDescription>{t('settings.themeDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={mode}
                onValueChange={handleThemeChange}
                options={themeOptions}
                className="w-full"
                aria-label={t('settings.theme')}
              />
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound size={20} className="text-primary" />
                <CardTitle>{t('settings.changePassword')}</CardTitle>
              </div>
              <CardDescription>{t('settings.changePasswordDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleChangePassword();
                }}
              >
                <PasswordInput
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  id="current-password"
                  label={t('settings.currentPassword')}
                  autocomplete="current-password"
                  disabled={isChangingPassword}
                />

                <div className="flex flex-col gap-1.5">
                  <PasswordInput
                    value={newPassword}
                    onChange={setNewPassword}
                    id="new-password"
                    label={t('settings.newPassword')}
                    autocomplete="new-password"
                    disabled={isChangingPassword}
                    invalid={newPassword.length > 0 && !isPasswordValid}
                  />
                  {newPassword.length > 0 && (
                    <ul className="text-sm space-y-1 mt-2">
                      {passwordRequirements.map((req) => (
                        <li
                          key={req.labelKey}
                          className={cn(
                            'flex items-center gap-2',
                            req.valid ? 'text-success' : 'text-muted-foreground',
                          )}
                        >
                          <span className="w-4">{req.valid ? '✓' : '○'}</span>
                          <span>{t(req.labelKey)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <PasswordInput
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    id="confirm-password"
                    label={t('settings.confirmPassword')}
                    autocomplete="new-password"
                    disabled={isChangingPassword}
                    invalid={confirmPassword.length > 0 && !doPasswordsMatch}
                  />
                  {confirmPassword.length > 0 && !doPasswordsMatch && (
                    <p className="text-sm text-error">{t('settings.passwordMismatch')}</p>
                  )}
                </div>

                <Button type="submit" disabled={!canSubmitPassword} className="self-start mt-2">
                  {isChangingPassword ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{t('settings.changing')}</span>
                    </>
                  ) : (
                    <span>{t('settings.changePassword')}</span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 size={20} className="text-destructive" />
                <CardTitle>{t('settings.dangerZone')}</CardTitle>
              </div>
              <CardDescription>{t('settings.dangerZoneDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h4 className="font-medium">{t('settings.deleteAccount')}</h4>
                  <p className="text-sm text-muted-foreground">{t('settings.deleteAccountDesc')}</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                  }}
                  disabled={isDeletingAccount}
                  className="shrink-0"
                >
                  {isDeletingAccount ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{t('settings.deleting')}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>{t('settings.deleteAccount')}</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </AppShell>

      {showDeleteConfirm && (
        <ConfirmDialog
          open={showDeleteConfirm}
          title={t('settings.deleteConfirmTitle')}
          description={t('settings.deleteConfirmDesc')}
          confirmLabel={t('settings.deleteAccount')}
          onConfirm={() => {
            void handleDeleteAccount();
          }}
          onCancel={() => {
            setShowDeleteConfirm(false);
          }}
        />
      )}
    </>
  );
}
