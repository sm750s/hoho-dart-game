import { DEFAULT_COSMETICS, restoreCosmetics } from "./treasures.ts";
import type { Cosmetics } from "./treasures.ts";
import { MAX_TOTAL_SCORE } from "./game.ts";

// 점수 규칙이 바뀌면 다른 기록과 섞이지 않게 키의 버전을 올립니다.
export const BEST_SCORE_KEY = "family-dart-best-score-v1-100";
export const MISSION_STARS_KEY = "family-dart-mission-stars-v1";
type RecordStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type StorageProvider = () => RecordStorage;
export type BestRecord = { score: number; available: boolean };

const browserStorage: StorageProvider = () => window.localStorage;

export function readBestScore(getStorage: StorageProvider = browserStorage): BestRecord {
  try {
    const raw = getStorage().getItem(BEST_SCORE_KEY);
    const score = raw !== null && /^\d+$/.test(raw) ? Number(raw) : 0;
    const valid = Number.isInteger(score) && score >= 0 && score <= MAX_TOTAL_SCORE && score % 10 === 0;
    return { score: valid ? score : 0, available: true };
  } catch {
    return { score: 0, available: false };
  }
}

export function saveBestScore(score: number, getStorage: StorageProvider = browserStorage): boolean {
  if (!Number.isInteger(score) || score < 0 || score > MAX_TOTAL_SCORE || score % 10 !== 0) return false;
  try {
    getStorage().setItem(BEST_SCORE_KEY, String(score));
    return true;
  } catch {
    return false;
  }
}

export function deleteBestScore(getStorage: StorageProvider = browserStorage): boolean {
  try {
    getStorage().removeItem(BEST_SCORE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function readMissionStars(getStorage: StorageProvider = browserStorage): { stars: number; available: boolean } {
  try {
    const raw = getStorage().getItem(MISSION_STARS_KEY);
    const stars = raw !== null && /^\d+$/.test(raw) ? Number(raw) : 0;
    return { stars: Number.isSafeInteger(stars) && stars >= 0 ? stars : 0, available: true };
  } catch {
    return { stars: 0, available: false };
  }
}

export function saveMissionStars(stars: number, getStorage: StorageProvider = browserStorage): boolean {
  if (!Number.isSafeInteger(stars) || stars < 0) return false;
  try {
    getStorage().setItem(MISSION_STARS_KEY, String(stars));
    return true;
  } catch {
    return false;
  }
}

export const COSMETICS_KEY = "family-dart-cosmetics-v1";

export function readCosmetics(stars: number, getStorage: StorageProvider = browserStorage): { cosmetics: Cosmetics; available: boolean } {
  try {
    const raw = getStorage().getItem(COSMETICS_KEY);
    let value: unknown = null;
    try { value = raw === null ? null : JSON.parse(raw); } catch { /* 손상된 데이터는 기본 꾸미기로 복구합니다. */ }
    return { cosmetics: restoreCosmetics(value, stars), available: true };
  } catch {
    return { cosmetics: { ...DEFAULT_COSMETICS }, available: false };
  }
}

export function saveCosmetics(cosmetics: Cosmetics, stars: number, getStorage: StorageProvider = browserStorage): boolean {
  try {
    getStorage().setItem(COSMETICS_KEY, JSON.stringify(restoreCosmetics(cosmetics, stars)));
    return true;
  } catch { return false; }
}
