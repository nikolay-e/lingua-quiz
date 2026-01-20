export function clearTimer(timer: ReturnType<typeof setTimeout> | null): null {
  if (timer !== null) {
    clearTimeout(timer);
  }
  return null;
}
