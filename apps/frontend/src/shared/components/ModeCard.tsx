import type { LucideIcon } from 'lucide-react';
import { cn } from '@shared/utils';

const VARIANT_STYLES = {
  primary: {
    card: 'bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30 cursor-pointer',
    icon: 'text-primary',
  },
  secondary: {
    card: 'bg-secondary/5 border-secondary/20 hover:bg-secondary/10 hover:border-secondary/30 cursor-pointer',
    icon: 'text-secondary-foreground',
  },
};

interface ModeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  disabled: boolean;
  variant: 'primary' | 'secondary';
  onClick: () => void;
  badge?: string;
}

export function ModeCard({
  icon: Icon,
  title,
  description,
  disabled,
  variant,
  onClick,
  badge,
}: ModeCardProps): React.JSX.Element {
  const styles = VARIANT_STYLES[variant];

  return (
    <button
      className={cn(
        'flex flex-col items-start gap-3 p-5 rounded-lg border text-left transition-all',
        disabled ? 'bg-card border-border opacity-60 cursor-not-allowed' : styles.card,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={28} className={disabled ? 'text-muted-foreground' : styles.icon} />
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {badge !== undefined && <span className="text-xs text-primary/70">{badge}</span>}
    </button>
  );
}
