import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn, Loader2 } from 'lucide-react';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent } from '@shared/ui';
import { PageContainer, PasswordInput } from '@shared/components';
import { cn, extractErrorMessage } from '@shared/utils';

export function LoginPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setHasError(false);

    try {
      await login(username, password);
      setMessage(t('auth.loginSuccess'));
      void navigate('/');
    } catch (error: unknown) {
      setMessage(extractErrorMessage(error, t('auth.loginFailed')));
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="md" centered>
      <Card>
        <CardHeader className="text-center">
          <CardTitle id="login-title" data-testid="login-title">
            {t('auth.signIn')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            aria-busy={isLoading}
            aria-labelledby="login-title"
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
              autocomplete="current-password"
              invalid={hasError}
            />

            <Button type="submit" disabled={isLoading} className="w-full mt-2">
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>{t('auth.signingIn')}</span>
                </>
              ) : (
                <>
                  <LogIn size={16} aria-hidden="true" />
                  <span>{t('auth.signIn')}</span>
                </>
              )}
            </Button>
          </form>

          {message !== '' && (
            <div
              id="login-message"
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
            {t('auth.needAccount')}{' '}
            <button
              type="button"
              className="text-primary hover:underline font-medium bg-transparent border-none cursor-pointer transition-colors"
              onClick={() => navigate('/register')}
            >
              {t('auth.registerHere')}
            </button>
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
