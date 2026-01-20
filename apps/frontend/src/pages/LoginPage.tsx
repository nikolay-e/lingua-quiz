import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn, Loader2 } from 'lucide-react';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { Button, Input, Label } from '@shared/ui';
import { PasswordInput } from '@shared/components';
import { extractErrorMessage } from '@shared/utils';

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
    <div className="auth-layout">
      <div className="auth-card">
        <h2 id="login-title" data-testid="login-title">
          {t('auth.signIn')}
        </h2>
        <form onSubmit={handleSubmit} aria-busy={isLoading} aria-labelledby="login-title" className="form-compact">
          <div className="input-group">
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

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('auth.signingIn')}</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>{t('auth.signIn')}</span>
              </>
            )}
          </Button>
        </form>

        {message !== '' && (
          <div
            id="login-message"
            className={`auth-message ${hasError ? 'error' : 'success'}`}
            role={hasError ? 'alert' : 'status'}
          >
            {message}
          </div>
        )}

        <p className="auth-link-text">
          {t('auth.needAccount')}{' '}
          <button type="button" className="auth-link" onClick={() => navigate('/register')}>
            {t('auth.registerHere')}
          </button>
        </p>
      </div>
    </div>
  );
}
