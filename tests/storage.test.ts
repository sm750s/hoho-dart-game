import assert from "node:assert/strict";
import test from "node:test";
import { BEST_SCORE_KEY, deleteBestScore, MISSION_STARS_KEY, readBestScore, readMissionStars, saveBestScore, saveMissionStars } from "../src/storage.ts";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); },
    removeItem: (key: string) => { items.delete(key); },
  };
}

test("기록이 없으면 0점이며 저장 후 같은 저장 공간에서 복원한다", () => {
  const storage = memoryStorage();
  assert.deepEqual(readBestScore(() => storage), { score: 0, available: true });
  assert.equal(saveBestScore(230, () => storage), true);
  assert.deepEqual(readBestScore(() => storage), { score: 230, available: true });
  assert.equal(saveBestScore(300, () => storage), true);
  assert.equal(readBestScore(() => storage).score, 300);
});

test("미션 별을 복원하고 최고 기록 삭제와 독립적으로 유지한다", () => {
  const storage = memoryStorage();
  assert.deepEqual(readMissionStars(() => storage), { stars: 0, available: true });
  assert.equal(saveMissionStars(12, () => storage), true);
  saveBestScore(200, () => storage);
  deleteBestScore(() => storage);
  assert.deepEqual(readMissionStars(() => storage), { stars: 12, available: true });
  assert.equal(readBestScore(() => storage).score, 0);
});

test("별의 잘못된 저장 값과 저장 차단을 처리한다", () => {
  const storage = memoryStorage();
  for (const value of ["NaN", "-1", "1.5", "9007199254740992", "null", ""]) {
    storage.items.set(MISSION_STARS_KEY, value);
    assert.equal(readMissionStars(() => storage).stars, 0);
  }
  const blocked = () => { throw new Error("blocked"); };
  assert.deepEqual(readMissionStars(blocked), { stars: 0, available: false });
  assert.equal(saveMissionStars(1, blocked), false);
  assert.equal(saveMissionStars(-1, () => storage), false);
  storage.setItem = () => { throw new Error("quota"); };
  assert.equal(saveMissionStars(1, () => storage), false);
});

test("손상되거나 점수 범위를 벗어난 기록은 0점으로 처리한다", () => {
  const storage = memoryStorage();
  for (const value of ["", "null", "NaN", "-10", "301", "90x", "2.5", "Infinity", "15"]) {
    storage.items.set(BEST_SCORE_KEY, value);
    assert.equal(readBestScore(() => storage).score, 0);
  }
  for (const score of [-10, 310, 15, NaN, Infinity]) {
    assert.equal(saveBestScore(score, () => storage), false);
  }
});

test("저장 공간 접근이 차단되어도 읽기·저장·삭제가 오류를 던지지 않는다", () => {
  const blocked = () => { throw new Error("SecurityError"); };
  assert.deepEqual(readBestScore(blocked), { score: 0, available: false });
  assert.equal(saveBestScore(100, blocked), false);
  assert.equal(deleteBestScore(blocked), false);
});

test("용량 초과와 저장·삭제 실패를 알린다", () => {
  const storage = memoryStorage();
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  storage.removeItem = () => { throw new Error("blocked"); };
  assert.equal(saveBestScore(100, () => storage), false);
  assert.equal(deleteBestScore(() => storage), false);
});

test("최고 기록 삭제는 다른 저장 데이터를 유지하고 재등록할 수 있다", () => {
  const storage = memoryStorage();
  storage.items.set("another-app", "keep");
  saveBestScore(200, () => storage);
  assert.equal(deleteBestScore(() => storage), true);
  assert.equal(readBestScore(() => storage).score, 0);
  assert.equal(storage.items.get("another-app"), "keep");
  assert.equal(deleteBestScore(() => storage), true);
  saveBestScore(80, () => storage);
  assert.equal(readBestScore(() => storage).score, 80);
});
