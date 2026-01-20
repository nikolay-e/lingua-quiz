import { SCORING } from './constants';

export function scoreToColor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= SCORING.COLOR_GREEN_THRESHOLD) {
    return '#22c55e';
  }
  if (clamped >= SCORING.COLOR_YELLOW_THRESHOLD) {
    const t = (clamped - SCORING.COLOR_YELLOW_THRESHOLD) / 20;
    const r = Math.round(234 + (34 - 234) * t);
    const g = Math.round(179 + (197 - 179) * t);
    const b = Math.round(8 + (94 - 8) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const t = clamped / SCORING.COLOR_YELLOW_THRESHOLD;
  const r = Math.round(239 + (234 - 239) * t);
  const g = Math.round(68 + (179 - 68) * t);
  const b = Math.round(68 + (8 - 68) * t);
  return `rgb(${r}, ${g}, ${b})`;
}
