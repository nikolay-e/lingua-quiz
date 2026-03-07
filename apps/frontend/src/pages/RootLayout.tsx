import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@features/auth/stores/auth.store';
import { useThemeStore } from '@features/settings/stores/theme.store';
import { useQuizStore } from '@features/quiz/stores/quiz.store';
import { AppNav } from '@shared/components';

export function RootLayout(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const username = useAuthStore((state) => state.username);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const resetQuiz = useQuizStore((state) => state.reset);

  const isInitialized = useRef(false);
  const currentPath = location.pathname;

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

    const protectedRoutes = ['/', '/quiz', '/speak', '/admin', '/settings'];
    const publicRoutes = ['/login', '/register'];

    if (!isAuthenticated && protectedRoutes.includes(currentPath)) {
      void navigate('/login', { replace: true });
    } else if (isAuthenticated && publicRoutes.includes(currentPath)) {
      void navigate('/', { replace: true });
    } else if (currentPath === '/admin' && !isAdmin) {
      void navigate('/', { replace: true });
    }
  }, [isAuthenticated, isAdmin, currentPath, navigate]);

  return (
    <div className={isAuthenticated ? 'has-bottom-nav' : ''}>
      {isAuthenticated && <AppNav username={username} isAdmin={isAdmin} />}
      <Outlet />
    </div>
  );
}
