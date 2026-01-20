import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, Loader2 } from 'lucide-react';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent } from '@shared/ui';
import { PageContainer, PasswordInput } from '@shared/components';
import { cn, extractErrorMessage } from '@shared/utils';

export function RegisterPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const passwordRequirements = useMemo(
    () => [
      { labelKey: 'auth.reqLength', valid: password.length >= 8 },
      { labelKey: 'auth.reqUppercase', valid: /[A-Z]/.test(password) },
      { labelKey: 'auth.reqLowercase', valid: /[a-z]/.test(password) },
      { labelKey: 'auth.reqNumber', valid: /\d/.test(password) },
      { labelKey: 'auth.reqSpecial', valid: /[!@#$%^&*()_\-+=[\]{}`;:'",.\\|<>/?~]/.test(password) },
    ],
    [password],
  );

  const isPasswordValid = passwordRequirements.every((r) => r.valid);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!isPasswordValid) {
      setMessage(t('auth.meetRequirements'));
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setMessage('');
    setHasError(false);

    try {
      await register(username, password);
      setMessage(t('auth.registerSuccess'));
      void navigate('/');
    } catch (error: unknown) {
      setMessage(extractErrorMessage(error, t('auth.registerFailed')));
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="md" centered>
      <Card>
        <CardHeader className="text-center">
          <CardTitle id="register-title" data-testid="register-title">
            {t('auth.signUp')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            aria-busy={isLoading}
            aria-labelledby="register-title"
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">{t('auth.username')}</Label>
              <Input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                aria-required="true"
                aria-invalid={hasError}
                disabled={isLoading}
                autoComplete="username"
                autoFocus
              />
            </div>

            <PasswordInput
              value={password}
              onChange={setPassword}
              disabled={isLoading}
              id="password"
              label={t('auth.password')}
              autocomplete="new-password"
              invalid={hasError || (password.length > 0 && !isPasswordValid)}
            />

            {password.length > 0 && (
              <div className="text-sm">
                <p className="font-medium text-muted-foreground mb-2">{t('auth.passwordRequirements')}</p>
                <ul className="space-y-1">
                  {passwordRequirements.map((req) => (
                    <li
                      key={req.labelKey}
                      className={cn('flex items-center gap-2', req.valid ? 'text-success' : 'text-muted-foreground')}
                    >
                      <span className="w-4">{req.valid ? '✓' : '○'}</span>
                      <span>{t(req.labelKey)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button type="submit" disabled={isLoading || !isPasswordValid} className="w-full mt-2">
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>{t('auth.creatingAccount')}</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} aria-hidden="true" />
                  <span>{t('auth.signUp')}</span>
                </>
              )}
            </Button>
          </form>

          {message !== '' && (
            <div
              id="register-message"
              className={cn(
                'mt-4 p-3 rounded-lg text-center text-sm',
                hasError ? 'bg-error/10 text-error' : 'bg-success/10 text-success',
              )}
              role={hasError ? 'alert' : 'status'}
            >
              {message}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('auth.haveAccount')}{' '}
            <button
              type="button"
              className="text-primary hover:underline font-medium bg-transparent border-none cursor-pointer transition-colors"
              onClick={() => navigate('/login')}
            >
              {t('auth.signInHere')}
            </button>
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
