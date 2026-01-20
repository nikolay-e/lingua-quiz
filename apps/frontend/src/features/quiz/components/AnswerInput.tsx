import { useRef, useImperativeHandle, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Eye, Loader2 } from 'lucide-react';
import { Button, Input } from '@shared/ui';

interface AnswerInputProps {
  value: string;
  disabled: boolean;
  onSubmit: () => void;
  onValueChange: (value: string) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

export interface AnswerInputRef {
  focus: () => void;
}

export const AnswerInput = forwardRef<AnswerInputRef, AnswerInputProps>(
  ({ value, disabled, onSubmit, onValueChange, onSkip, isLoading = false }, ref): React.JSX.Element => {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!disabled && !isLoading) onSubmit();
    };

    return (
      <form className="flex flex-col gap-3" onSubmit={handleFormSubmit}>
        <label htmlFor="answer-input" className="sr-only">
          {t('quiz.yourAnswer')}
        </label>
        <Input
          id="answer-input"
          type="text"
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
          }}
          placeholder={t('quiz.typeAnswer')}
          disabled={disabled || isLoading}
          aria-describedby="word"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <div className="flex flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            disabled={onSkip === undefined || isLoading}
            className="flex-1"
          >
            <Eye size={16} />
            <span>{t('quiz.showAnswer')}</span>
          </Button>
          <Button type="submit" variant="default" disabled={disabled || isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('quiz.checking')}</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>{t('quiz.checkAnswer')}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    );
  },
);
