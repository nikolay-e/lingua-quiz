import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Settings, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@shared/utils';

const NAV_LINKS = [
  { path: '/', icon: Home, labelKey: 'nav.home' },
  { path: '/quiz', icon: BookOpen, labelKey: 'nav.quiz' },
] as const;

interface AppNavProps {
  username: string | null;
  isAdmin: boolean;
}

export function AppNav({ username, isAdmin }: AppNavProps): React.JSX.Element {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const isActive = (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path));

  return (
    <>
      <nav className="hidden md:flex items-center justify-between px-6 py-3 bg-surface border-b border-border">
        <Link
          to="/"
          className="text-lg font-semibold text-foreground no-underline hover:text-primary transition-colors"
        >
          LinguaQuiz
        </Link>
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ path, icon: Icon, labelKey }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm no-underline transition-colors',
                isActive(path)
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <Icon size={16} />
              <span>{t(labelKey)}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          {username !== null && <span className="text-sm text-muted-foreground">{username}</span>}
          {isAdmin && (
            <Link
              to="/admin"
              role="button"
              className={cn(
                'flex items-center gap-1.5 text-sm no-underline transition-colors',
                isActive('/admin') ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Shield size={16} />
              {t('nav.adminPanel')}
            </Link>
          )}
          <Link
            to="/settings"
            role="button"
            className={cn(
              'flex items-center transition-colors',
              isActive('/settings') ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label={t('nav.settings')}
          >
            <Settings size={20} />
          </Link>
        </div>
      </nav>

      <nav className="bottom-nav md:hidden" aria-label={t('nav.navigation')}>
        <div className="flex items-center justify-around h-14">
          {NAV_LINKS.map(({ path, icon: Icon, labelKey }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full no-underline transition-colors',
                isActive(path) ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-current={isActive(path) ? 'page' : undefined}
            >
              <Icon size={20} />
              <span className="text-xs leading-tight">{t(labelKey)}</span>
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              role="button"
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full no-underline transition-colors',
                isActive('/admin') ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-current={isActive('/admin') ? 'page' : undefined}
            >
              <Shield size={20} />
              <span className="text-xs leading-tight">{t('nav.adminPanel')}</span>
            </Link>
          )}
          <Link
            to="/settings"
            role="button"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full no-underline transition-colors',
              isActive('/settings') ? 'text-primary' : 'text-muted-foreground',
            )}
            aria-current={isActive('/settings') ? 'page' : undefined}
          >
            <Settings size={20} />
            <span className="text-xs leading-tight">{t('nav.settings')}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
