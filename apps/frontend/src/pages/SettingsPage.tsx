import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  KeyRound,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  User,
  Globe,
  Sun,
  Moon,
  Monitor,
  Mic,
} from 'lucide-react';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { useThemeStore } from '@features/settings/stores/theme.store';
import { useSpeakStore } from '@features/speak';
import { AZURE_REGIONS } from '@features/speak/lib/constants';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, Select } from '@shared/ui';
import { ConfirmDialog, PageContainer, useToast } from '@shared/components';
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

  const azureApiKey = useSpeakStore((state) => state.azureApiKey);
  const azureRegion = useSpeakStore((state) => state.azureRegion);
  const setAzureCredentials = useSpeakStore((state) => state.setAzureCredentials);

  const currentLocale = i18n.language as SupportedLocale;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [localAzureKey, setLocalAzureKey] = useState(azureApiKey);
  const [localAzureRegion, setLocalAzureRegion] = useState(azureRegion);
  const [showAzureKey, setShowAzureKey] = useState(false);

  const passwordRequirements = useMemo(
    () => [
      { labelKey: 'settings.reqLength', valid: newPassword.length >= 8 },
      { labelKey: 'settings.reqUppercase', valid: /[A-Z]/.test(newPassword) },
      { labelKey: 'settings.reqLowercase', valid: /[a-z]/.test(newPassword) },
      { labelKey: 'settings.reqNumber', valid: /\d/.test(newPassword) },
      { labelKey: 'settings.reqSpecial', valid: /[!@#$%^&*()_\-+=[\]{}`;:'",.\\|<>/?~]/.test(newPassword) },
    ],
    [newPassword],
  );

  const isPasswordValid = passwordRequirements.every((r) => r.valid);
  const doPasswordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmitPassword = currentPassword.length > 0 && isPasswordValid && doPasswordsMatch && !isChangingPassword;

  const handleLanguageChange = (value: string) => {
    setLocale(value as SupportedLocale);
  };

  const handleThemeChange = (value: string) => {
    if (value === THEME_MODES.LIGHT || value === THEME_MODES.DARK || value === THEME_MODES.SYSTEM) {
      setMode(value);
    }
  };

  const handleSaveAzureCredentials = () => {
    setAzureCredentials(localAzureKey, localAzureRegion);
    toast.success(t('settings.azureSaved', 'Azure credentials saved'));
  };

  const azureRegionOptions = AZURE_REGIONS.map((region) => ({
    value: region.value,
    label: region.label,
  }));

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

  const languageOptions = getSupportedLocales().map((loc) => ({
    value: loc,
    label: LOCALE_NAMES[loc],
  }));

  const themeOptions = THEME_MODES_LIST.map((themeMode) => ({
    value: themeMode,
    label: t(THEME_MODE_NAMES[themeMode]),
  }));

  const ThemeIcon = mode === THEME_MODES.DARK ? Moon : mode === THEME_MODES.LIGHT ? Sun : Monitor;

  return (
    <>
      <PageContainer maxWidth="xl">
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
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
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
              <Select value={mode} onValueChange={handleThemeChange} options={themeOptions} className="w-full" />
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mic size={20} className="text-primary" />
                <CardTitle>{t('settings.azureSpeech', 'Pronunciation (Azure Speech)')}</CardTitle>
              </div>
              <CardDescription>
                {t('settings.azureSpeechDesc', 'Configure Azure Speech Services for pronunciation assessment')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="azure-key">{t('settings.azureKey', 'Azure Speech Key')}</Label>
                  <div className="relative flex items-center">
                    <Input
                      id="azure-key"
                      type={showAzureKey ? 'text' : 'password'}
                      value={localAzureKey}
                      onChange={(e) => {
                        setLocalAzureKey(e.target.value);
                      }}
                      placeholder={t('settings.azureKeyPlaceholder', 'Enter your Azure Speech API key')}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      className="absolute right-2 p-1 bg-transparent border-none cursor-pointer text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors"
                      onClick={() => {
                        setShowAzureKey(!showAzureKey);
                      }}
                      aria-label={showAzureKey ? t('settings.hidePassword') : t('settings.showPassword')}
                    >
                      {showAzureKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="azure-region">{t('settings.azureRegion', 'Azure Region')}</Label>
                  <Select
                    value={localAzureRegion}
                    onValueChange={setLocalAzureRegion}
                    options={azureRegionOptions}
                    className="w-full"
                  />
                </div>
                <Button type="button" onClick={handleSaveAzureCredentials} className="self-start mt-2">
                  {t('settings.saveAzure', 'Save Azure Settings')}
                </Button>
              </div>
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
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="current-password">{t('settings.currentPassword')}</Label>
                  <div className="relative flex items-center">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                      }}
                      autoComplete="current-password"
                      disabled={isChangingPassword}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      className="absolute right-2 p-1 bg-transparent border-none cursor-pointer text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors"
                      onClick={() => {
                        setShowCurrentPassword(!showCurrentPassword);
                      }}
                      aria-label={showCurrentPassword ? t('settings.hidePassword') : t('settings.showPassword')}
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-password">{t('settings.newPassword')}</Label>
                  <div className="relative flex items-center">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                      }}
                      autoComplete="new-password"
                      disabled={isChangingPassword}
                      aria-invalid={newPassword.length > 0 && !isPasswordValid}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      className="absolute right-2 p-1 bg-transparent border-none cursor-pointer text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors"
                      onClick={() => {
                        setShowNewPassword(!showNewPassword);
                      }}
                      aria-label={showNewPassword ? t('settings.hidePassword') : t('settings.showPassword')}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
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
                  <Label htmlFor="confirm-password">{t('settings.confirmPassword')}</Label>
                  <div className="relative flex items-center">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                      }}
                      autoComplete="new-password"
                      disabled={isChangingPassword}
                      aria-invalid={confirmPassword.length > 0 && !doPasswordsMatch}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      className="absolute right-2 p-1 bg-transparent border-none cursor-pointer text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors"
                      onClick={() => {
                        setShowConfirmPassword(!showConfirmPassword);
                      }}
                      aria-label={showConfirmPassword ? t('settings.hidePassword') : t('settings.showPassword')}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
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
      </PageContainer>

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
