import { logger } from '../utils/logger';

let wakeLock: WakeLockSentinel | null = null;

export function isWakeLockSupported(): boolean {
  return 'wakeLock' in navigator;
}

export async function requestWakeLock(): Promise<boolean> {
  if (!isWakeLockSupported()) {
    return false;
  }

  try {
    wakeLock = await navigator.wakeLock.request('screen');

    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });

    return true;
  } catch (error) {
    logger.debug('Wake lock request failed', { error });
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (wakeLock !== null) {
    await wakeLock.release();
    wakeLock = null;
  }
}

export function isWakeLockActive(): boolean {
  return wakeLock !== null;
}

export async function reacquireWakeLockOnVisibilityChange(): Promise<void> {
  if (document.visibilityState === 'visible' && wakeLock === null) {
    await requestWakeLock();
  }
}
