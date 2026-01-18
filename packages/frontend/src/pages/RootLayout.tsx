import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { useThemeStore } from '@features/settings/stores/theme.store';
import { useQuizStore } from '@features/quiz/stores/quiz.store';
import { Button } from '@shared/ui';

export function RootLayout(): React.JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const resetQuiz = useQuizStore((state) => state.reset);

  const isInitialized = useRef(false);
  const currentPath = location.pathname;
  const isAdminPage = currentPath === '/admin';
  const isQuizPage = currentPath === '/' || currentPath === '/quiz';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (!isAuthenticated) {
      resetQuiz();
    }
  }, [isAuthenticated, resetQuiz]);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const protectedRoutes = ['/', '/quiz', '/admin', '/settings'];
    const publicRoutes = ['/login', '/register'];

    if (!isAuthenticated && protectedRoutes.includes(currentPath)) {
      navigate('/login', { replace: true });
    } else if (isAuthenticated && publicRoutes.includes(currentPath)) {
      navigate('/', { replace: true });
    } else if (currentPath === '/admin' && !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isAdmin, currentPath, navigate]);

  return (
    <>
      {isAuthenticated && isAdminPage && isAdmin && (
        <div className="admin-nav">
          <Button variant="outline" onClick={() => navigate('/')}>
            <svg className="mr-2 size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('nav.backToQuiz')}
          </Button>
        </div>
      )}
      {isAuthenticated && isAdmin && isQuizPage && (
        <div className="admin-nav">
          <Button variant="secondary" onClick={() => navigate('/admin')}>
            <Settings size={16} className="mr-2" />
            {t('nav.adminPanel')}
          </Button>
        </div>
      )}

      <Outlet />

      <style>{`
        .admin-nav {
          position: fixed;
          top: max(var(--spacing-sm), env(safe-area-inset-top, 0px));
          right: max(var(--spacing-sm), env(safe-area-inset-right, 0px));
          z-index: 1000;
        }
      `}</style>
    </>
  );
}
