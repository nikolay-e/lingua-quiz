import { useMemo } from 'react';

interface PasswordRequirement {
  labelKey: string;
  valid: boolean;
}

interface PasswordValidation {
  requirements: PasswordRequirement[];
  isValid: boolean;
}

export function usePasswordValidation(password: string, labelPrefix = 'auth'): PasswordValidation {
  const requirements = useMemo(
    () => [
      { labelKey: `${labelPrefix}.reqLength`, valid: password.length >= 8 },
      { labelKey: `${labelPrefix}.reqUppercase`, valid: /[A-Z]/.test(password) },
      { labelKey: `${labelPrefix}.reqLowercase`, valid: /[a-z]/.test(password) },
      { labelKey: `${labelPrefix}.reqNumber`, valid: /\d/.test(password) },
      { labelKey: `${labelPrefix}.reqSpecial`, valid: /[!@#$%^&*()_\-+=[\]{}`;:'",.\\|<>/?~]/.test(password) },
    ],
    [password, labelPrefix],
  );

  const isValid = requirements.every((r) => r.valid);

  return { requirements, isValid };
}
