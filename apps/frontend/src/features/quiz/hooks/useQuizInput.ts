import { useState } from 'react';

export interface QuizInputReturn {
  userAnswer: string;
  awaitingNextInput: boolean;
  setUserAnswer: (v: string) => void;
  setAwaitingNextInput: (v: boolean) => void;
  handleValueChange: (v: string) => void;
  resetInput: () => void;
}

export function useQuizInput(onAwaitingInputClear: () => void): QuizInputReturn {
  const [userAnswer, setUserAnswer] = useState('');
  const [awaitingNextInput, setAwaitingNextInput] = useState(false);

  const handleValueChange = (v: string): void => {
    if (awaitingNextInput) {
      onAwaitingInputClear();
      setAwaitingNextInput(false);
    }
    setUserAnswer(v);
  };

  const resetInput = () => {
    setUserAnswer('');
    setAwaitingNextInput(false);
  };

  return {
    userAnswer,
    awaitingNextInput,
    setUserAnswer,
    setAwaitingNextInput,
    handleValueChange,
    resetInput,
  };
}
