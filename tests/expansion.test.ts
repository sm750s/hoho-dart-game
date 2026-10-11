import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_COSMETICS, restoreCosmetics } from "../src/treasures.ts";
import { COSMETICS_KEY, BEST_SCORE_KEY, MISSION_STARS_KEY, readCosmetics, saveCosmetics, saveMissionStars } from "../src/storage.ts";
import { drawLuckScore, hasLuckHit, LUCK_SCORES } from "../src/luck.ts";
import { calculateScore, gameReducer, INITIAL_GAME_STATE } from "../src/game.ts";

function memory() {
  const items = new Map<string, string>();
  return { items, getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); }, removeItem: (key: string) => { items.delete(key); } };
}

test("별 3·5·8개 경계에서만 보물이 해제된다", () => {
  assert.equal(restoreCosmetics({ theme: "sea" }, 2).theme, "forest");
  assert.equal(restoreCosmetics({ theme: "sea" }, 3).theme, "sea");
  assert.equal(restoreCosmetics({ decoration: "star" }, 4).decoration, "plain");
  assert.equal(restoreCosmetics({ decoration: "star" }, 5).decoration, "star");
  assert.equal(restoreCosmetics({ theme: "space" }, 7).theme, "forest");
  assert.equal(restoreCosmetics({ theme: "space", decoration: "star" }, 8).theme, "space");
});

test("꾸미기 선택은 별을 소모하지 않고 복원되며 잘못된 값은 기본값이다", () => {
  const storage = memory();
  saveMissionStars(8, () => storage);
  assert.equal(saveCosmetics({ theme: "space", decoration: "star" }, 8, () => storage), true);
  assert.deepEqual(readCosmetics(8, () => storage).cosmetics, { theme: "space", decoration: "star" });
  assert.equal(storage.items.get(MISSION_STARS_KEY), "8");
  assert.deepEqual(readCosmetics(0, () => storage).cosmetics, DEFAULT_COSMETICS);
  for (const raw of ["{", "null", "[]", '"space"', '{"theme":"alien","decoration":"other"}']) {
    storage.items.set(COSMETICS_KEY, raw);
    assert.deepEqual(readCosmetics(8, () => storage).cosmetics, DEFAULT_COSMETICS);
  }
});

test("별과 보물 초기화는 최고 기록을 보존하며 저장 실패를 반환한다", () => {
  const storage = memory();
  storage.items.set(BEST_SCORE_KEY, "300");
  saveMissionStars(8, () => storage);
  saveCosmetics({ theme: "space", decoration: "star" }, 8, () => storage);
  saveMissionStars(0, () => storage);
  saveCosmetics(DEFAULT_COSMETICS, 0, () => storage);
  assert.deepEqual(readCosmetics(0, () => storage).cosmetics, DEFAULT_COSMETICS);
  assert.equal(storage.items.get(BEST_SCORE_KEY), "300");
  const blocked = () => { throw new Error("blocked"); };
  assert.deepEqual(readCosmetics(8, blocked), { cosmetics: DEFAULT_COSMETICS, available: false });
  assert.equal(saveCosmetics(DEFAULT_COSMETICS, 0, blocked), false);
  storage.setItem = () => { throw new Error("quota"); };
  assert.equal(saveCosmetics(DEFAULT_COSMETICS, 0, () => storage), false);
});

test("행운 점수는 동일한 열 구간에서 10~100점만 추첨한다", () => {
  assert.equal(new Set(LUCK_SCORES).size, 10);
  for (let i = 0; i < 10; i++) {
    assert.equal(drawLuckScore(() => i / 10), LUCK_SCORES[i]);
    assert.equal(drawLuckScore(() => (i + .999) / 10), LUCK_SCORES[i]);
  }
  for (const value of [-1, 1, NaN, Infinity]) assert.throws(() => drawLuckScore(() => value), RangeError);
  assert.equal(drawLuckScore(() => .5), drawLuckScore(() => .5));
});

test("행운 배지는 정확한 명중에만 하나이며 점수와 투척 상태를 변경하지 않는다", () => {
  const scores = [0, 50, 60];
  assert.equal(hasLuckHit(60, scores), true);
  assert.equal(hasLuckHit(60, [60, 60, 60]), true);
  assert.equal(hasLuckHit(70, scores), false);
  assert.equal(hasLuckHit(0, scores), false);
  assert.equal(hasLuckHit(60, []), false);
  assert.deepEqual(scores, [0, 50, 60]);
  let game = INITIAL_GAME_STATE;
  for (let i = 0; i < 3; i++) game = gameReducer(game, { type: "throw", point: { x: 200, y: 200 } });
  assert.equal(hasLuckHit(100, game.shots.map((shot) => shot.score)), true);
  assert.equal(game.totalScore, 300);
  for (const theme of ["forest", "sea", "space"]) {
    restoreCosmetics({ theme, decoration: "star" }, 8);
    assert.equal(calculateScore({ x: 200, y: 200 }), 100);
  }
});
