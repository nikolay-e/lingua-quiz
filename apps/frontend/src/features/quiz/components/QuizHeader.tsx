import { useTranslation } from 'react-i18next';
import { BookOpen, ArrowLeft } from 'lucide-react';
import type { WordList } from '@api/types';
import { Button } from '@shared/ui';
import { LanguageLevelSelector } from './LanguageLevelSelector';

interface QuizHeaderProps {
  wordLists?: WordList[];
  selectedQuiz?: string | null;
  loading?: boolean;
  onSelect?: (quiz: string) => void;
  onBackToMenu?: () => void;
}

export function QuizHeader({
  wordLists = [],
  selectedQuiz = null,
  loading = false,
  onSelect,
  onBackToMenu,
}: QuizHeaderProps): React.JSX.Element {
  const { t } = useTranslation();

  const handleSelect = (listName: string): void => {
    onSelect?.(listName);
  };

  if (selectedQuiz === null) {
    return (
      <div className="flex flex-col gap-4">
        <LanguageLevelSelector wordLists={wordLists} loading={loading} onSelect={handleSelect} />
      </div>
    );
  }

  return (
    <div className="quiz-header flex flex-col gap-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen size={16} />
          <span className="text-lg font-semibold">{selectedQuiz}</span>
        </div>
        <Button variant="outline" size="sm" onClick={onBackToMenu}>
          <ArrowLeft size={16} />
          <span>{t('nav.backToMenu')}</span>
        </Button>
      </div>
    </div>
  );
}
