import { FeedCard } from '@shared/components';
import { Skeleton } from '@shared/ui';

export function QuizSkeleton(): React.JSX.Element {
  return (
    <div className="quiz-skeleton" role="status" aria-busy="true" aria-label="Loading quiz content">
      <span className="sr-only">Loading quiz, please wait...</span>
      <FeedCard>
        <div className="header-skeleton">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="select-skeleton">
          <Skeleton className="h-10 w-full" />
        </div>
      </FeedCard>

      <FeedCard dense>
        <div className="question-skeleton">
          <Skeleton className="h-12 w-3/4 mx-auto" />
        </div>
      </FeedCard>

      <FeedCard dense>
        <div className="input-skeleton">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-24" />
        </div>
      </FeedCard>

      <FeedCard>
        <div className="progress-skeleton">
          <Skeleton className="h-6 w-48 mb-4" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full mb-2" />
          ))}
        </div>
      </FeedCard>

      <style>{`
        .header-skeleton {
          padding: var(--spacing-md);
        }

        .select-skeleton {
          padding: var(--spacing-sm) var(--spacing-md);
        }

        .question-skeleton {
          padding: var(--spacing-lg);
          display: flex;
          justify-content: center;
        }

        .input-skeleton {
          display: flex;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm);
        }

        .progress-skeleton {
          padding: var(--spacing-md);
        }
      `}</style>
    </div>
  );
}
