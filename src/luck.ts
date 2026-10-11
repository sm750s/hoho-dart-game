import { SCORE_ZONES } from "./game.ts";
export const LUCK_SCORES: readonly number[] = SCORE_ZONES.map((zone) => zone.score);
export function drawLuckScore(random: () => number = Math.random): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError("추첨 값은 0 이상 1 미만이어야 합니다.");
  return LUCK_SCORES[Math.floor(value * LUCK_SCORES.length)]!;
}
export function hasLuckHit(target: number, scores: readonly number[]): boolean {
  return LUCK_SCORES.includes(target) && scores.includes(target);
}
