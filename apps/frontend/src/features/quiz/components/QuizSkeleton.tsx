import { FeedCard } from '@shared/components';
import { Skeleton } from '@shared/ui';

export function QuizSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4" role="status" aria-busy="true" aria-label="Loading quiz content">
      <span className="sr-only">Loading quiz, please wait...</span>
      <FeedCard>
        <div className="mb-4">
          <Skeleton className="h-8 w-48" />
        </div>
        <div>
          <Skeleton className="h-10 w-full" />
        </div>
      </FeedCard>

      <FeedCard dense>
        <div className="py-4">
          <Skeleton className="h-12 w-3/4 mx-auto" />
        </div>
      </FeedCard>

      <FeedCard dense>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-24" />
        </div>
      </FeedCard>

      <FeedCard>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48 mb-2" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </FeedCard>
    </div>
  );
}
