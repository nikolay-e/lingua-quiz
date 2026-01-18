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
      navigate('/');
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

      <style>{`
        .auth-layout {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-md);
          background-color: var(--color-background);
        }

        .auth-card {
          width: 100%;
          max-width: 400px;
          padding: var(--spacing-xl);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
        }

        .auth-card h2 {
          text-align: center;
          margin-bottom: var(--spacing-lg);
          color: var(--color-text);
        }

        .auth-message {
          margin-top: var(--spacing-md);
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
          text-align: center;
          font-size: var(--font-size-sm);
        }

        .auth-message.success {
          background-color: color-mix(in oklch, var(--color-success) 10%, transparent);
          color: var(--color-success);
        }

        .auth-message.error {
          background-color: var(--color-error-bg);
          color: var(--color-error-text);
        }

        .auth-link-text {
          margin-top: var(--spacing-lg);
          text-align: center;
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
        }

        .auth-link {
          background: none;
          border: none;
          color: var(--color-primary);
          cursor: pointer;
          text-decoration: underline;
          font-size: inherit;
        }

        .auth-link:hover {
          color: var(--color-primary);
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
