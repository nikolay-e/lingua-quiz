import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { Button } from '@shared/ui';

interface UserActionsProps {
  username: string | null;
}

export function UserActions({ username }: UserActionsProps): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const navigateToSettings = () => {
    void navigate('/settings');
  };

  return (
    <div className="actions">
      <Button variant="outline" onClick={navigateToSettings} className="w-full">
        <Settings size={16} />
        <span>
          {t('common.settings')} ({username})
        </span>
      </Button>
    </div>
  );
}
