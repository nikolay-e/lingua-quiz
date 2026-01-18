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
    <div className="input-group">
      {label !== '' && <Label htmlFor={id}>{label}</Label>}
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
      />
      <button
        type="button"
        className="toggle-password-btn disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => setShowPassword(!showPassword)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        tabIndex={-1}
        disabled={disabled}
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
