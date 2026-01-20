import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, Label } from '@shared/ui';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  label?: string;
  autocomplete?: 'current-password' | 'new-password';
  invalid?: boolean;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = '',
  disabled = false,
  id = 'password',
  label = '',
  autocomplete = 'current-password',
  invalid = false,
}: PasswordInputProps): React.JSX.Element {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative flex flex-col gap-1.5">
      {label !== '' && <Label htmlFor={id}>{label}</Label>}
      <div className="relative flex items-center">
        <Input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          aria-required="true"
          invalid={invalid}
          disabled={disabled}
          id={id}
          autoComplete={autocomplete}
          className="pr-11"
        />
        <button
          type="button"
          className="absolute right-2 p-1 bg-transparent border-none cursor-pointer text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={0}
          disabled={disabled}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
