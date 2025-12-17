import { logger } from '../utils/logger';

interface ShareProgressData {
  wordsLearned: number;
  masteredWords: number;
  streakDays?: number;
  language?: string;
}

export function isShareSupported(): boolean {
  return 'share' in navigator && typeof navigator.share === 'function';
}

export function canShare(data?: ShareData): boolean {
  if (!isShareSupported()) return false;
  if (data === undefined) return true;
  if ('canShare' in navigator && typeof navigator.canShare === 'function') {
    return navigator.canShare(data);
  }
  return true;
}

export async function shareProgress(data: ShareProgressData): Promise<boolean> {
  if (!isShareSupported()) {
    return false;
  }

  const text = buildShareText(data);
  const shareData: ShareData = {
    title: 'My lingua-quiz Progress',
    text,
    url: window.location.origin,
  };

  if (!canShare(shareData)) {
    return false;
  }

  try {
    await navigator.share(shareData);
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return false;
    }
    logger.error('Failed to share progress', { error });
    throw error;
  }
}

function buildShareText(data: ShareProgressData): string {
  const parts: string[] = [];

  if (data.language !== undefined && data.language !== '') {
    parts.push(`I'm learning ${data.language} with lingua-quiz!`);
  } else {
    parts.push("I'm learning languages with lingua-quiz!");
  }

  if (data.masteredWords > 0) {
    parts.push(`${data.masteredWords} words mastered`);
  }

  if (data.wordsLearned > 0) {
    parts.push(`${data.wordsLearned} words learned today`);
  }

  if (data.streakDays !== undefined && data.streakDays > 1) {
    parts.push(`${data.streakDays} day streak 🔥`);
  }

  return parts.join(' • ');
}

export async function shareAchievement(achievementTitle: string, achievementDescription: string): Promise<boolean> {
  if (!isShareSupported()) {
    return false;
  }

  const shareData: ShareData = {
    title: `lingua-quiz: ${achievementTitle}`,
    text: `${achievementDescription} 🎉`,
    url: window.location.origin,
  };

  try {
    await navigator.share(shareData);
    return true;
  } catch (error) {
    logger.debug('Failed to share achievement', { error });
    return false;
  }
}
