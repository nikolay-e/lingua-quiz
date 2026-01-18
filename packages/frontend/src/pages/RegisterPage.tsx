import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, Loader2 } from 'lucide-react';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { Button, Input, Label } from '@shared/ui';
import { PasswordInput } from '@shared/components';
import { extractErrorMessage } from '@shared/utils';

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
      navigate('/');
    } catch (error: unknown) {
      setMessage(extractErrorMessage(error, t('auth.registerFailed')));
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h2 id="register-title" data-testid="register-title">
          {t('auth.signUp')}
        </h2>
        <form onSubmit={handleSubmit} aria-busy={isLoading} aria-labelledby="register-title" className="form-compact">
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
            autocomplete="new-password"
            invalid={hasError || (password.length > 0 && !isPasswordValid)}
          />

          {password.length > 0 && (
            <div className="password-requirements">
              <p className="requirements-title">{t('auth.passwordRequirements')}</p>
              <ul>
                {passwordRequirements.map((req) => (
                  <li key={req.labelKey} className={req.valid ? 'valid' : ''}>
                    <span className="requirement-icon">{req.valid ? '✓' : '○'}</span>
                    <span>{t(req.labelKey)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button type="submit" disabled={isLoading || !isPasswordValid} className="w-full">
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('auth.creatingAccount')}</span>
              </>
            ) : (
              <>
                <UserPlus size={16} />
                <span>{t('auth.signUp')}</span>
              </>
            )}
          </Button>
        </form>

        {message !== '' && (
          <div
            id="register-message"
            className={`auth-message ${hasError ? 'error' : 'success'}`}
            role={hasError ? 'alert' : 'status'}
          >
            {message}
          </div>
        )}

        <p className="auth-link-text">
          {t('auth.haveAccount')}{' '}
          <button type="button" className="auth-link" onClick={() => navigate('/login')}>
            {t('auth.signInHere')}
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

        .password-requirements {
          font-size: var(--font-size-sm);
        }

        .requirements-title {
          margin: 0 0 var(--spacing-xs) 0;
          font-weight: var(--font-weight-medium);
        }

        .password-requirements ul {
          list-style: none;
          padding: 0;
          margin: 0;
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
      `}</style>
    </div>
  );
}
