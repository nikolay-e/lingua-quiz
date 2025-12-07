type TimerId = ReturnType<typeof setTimeout> | null;

export function clearTimer(timer: TimerId): null {
  if (timer !== null) {
    clearTimeout(timer);
  }
  return null;
}
