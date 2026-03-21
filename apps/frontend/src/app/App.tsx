import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from '@pages';
import { ProtectedRoute } from '@app/routing/ProtectedRoute';
import { AdminRoute } from '@app/routing/AdminRoute';
import { ErrorBoundary } from '@app/infra/ErrorBoundary';
import { Toasts } from '@shared/components';
import { Skeleton } from '@shared/ui';

const HomePage = lazy(() => import('@pages/HomePage').then((m) => ({ default: m.HomePage })));
const QuizPage = lazy(() => import('@pages/QuizPage').then((m) => ({ default: m.QuizPage })));
const LoginPage = lazy(() => import('@pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const SettingsPage = lazy(() => import('@pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const AdminPage = lazy(() => import('@pages/admin').then((m) => ({ default: m.AdminPage })));
const SpeakPage = lazy(() => import('@pages/SpeakPage').then((m) => ({ default: m.SpeakPage })));

function PageLoader(): React.JSX.Element {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <Skeleton className="h-64 w-full max-w-md" />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <HomePage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'quiz',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <QuizPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'speak',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <SpeakPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'login',
        element: (
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: 'register',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RegisterPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <Suspense fallback={<PageLoader />}>
              <AdminPage />
            </Suspense>
          </AdminRoute>
        ),
      },
    ],
  },
]);

export function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <Toasts />
    </ErrorBoundary>
  );
}
