import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RootLayout, HomePage, QuizPage, LoginPage, RegisterPage, SettingsPage, AdminPage, SpeakPage } from '@pages';
import { ProtectedRoute } from '@app/routing/ProtectedRoute';
import { AdminRoute } from '@app/routing/AdminRoute';
import { Toasts } from '@shared/components';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'learn',
        element: (
          <ProtectedRoute>
            <QuizPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'quiz',
        element: (
          <ProtectedRoute>
            <QuizPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'speak',
        element: (
          <ProtectedRoute>
            <SpeakPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        ),
      },
    ],
  },
]);

export function App(): React.JSX.Element {
  return (
    <>
      <RouterProvider router={router} />
      <Toasts />
    </>
  );
}
