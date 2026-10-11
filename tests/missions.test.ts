import assert from "node:assert/strict";
import test from "node:test";
import { awardMissionStar, evaluateMission } from "../src/missions.ts";

test("네 미션의 조건과 경계값을 정확히 판정한다", () => {
  assert.equal(evaluateMission("high", [70, 70, 70]).success, false);
  assert.equal(evaluateMission("high", [80, 0, 0]).success, true);
  assert.equal(evaluateMission("inside", [10, 10, 10]).success, true);
  assert.equal(evaluateMission("inside", [100, 0, 100]).success, false);
  assert.equal(evaluateMission("total", [60, 60, 50]).success, false);
  assert.equal(evaluateMission("total", [60, 60, 60]).success, true);
  assert.equal(evaluateMission("total", [100, 100, 100]).success, true);
  assert.equal(evaluateMission("exact", [50, 70, 100]).success, false);
  assert.equal(evaluateMission("exact", [60, 0, 0]).success, true);
});

test("중간에 조건을 달성해도 세 발을 완료하기 전에는 성공과 별을 확정하지 않는다", () => {
  const reward = { stars: 5, rewardedRound: null };
  for (const id of ["high", "inside", "total", "exact"] as const) {
    for (const scores of [[], [100], [100, 100], [60]]) {
      const progress = evaluateMission(id, scores);
      assert.equal(progress.complete, false);
      assert.equal(progress.success, false);
      assert.equal(awardMissionStar(reward, 1, progress), reward);
    }
  }
  assert.equal(evaluateMission("high", [80]).conditionMet, true);
  assert.equal(evaluateMission("total", [100, 100]).conditionMet, true);
  assert.equal(evaluateMission("exact", [60]).conditionMet, true);
});

test("성공한 판은 별을 한 번만 지급하고 같은 미션의 새 판은 다시 지급한다", () => {
  const success = evaluateMission("exact", [60, 60, 60]);
  const once = awardMissionStar({ stars: 2, rewardedRound: null }, 1, success);
  assert.equal(once.stars, 3);
  for (let i = 0; i < 20; i++) assert.equal(awardMissionStar(once, 1, success), once);
  const twice = awardMissionStar(once, 2, success);
  assert.equal(twice.stars, 4);
  assert.equal(twice.rewardedRound, 2);
});

test("실패와 중도 재시작, 복원된 별과 빈 판에는 보상을 지급하지 않는다", () => {
  const reward = { stars: 7, rewardedRound: null };
  assert.equal(awardMissionStar(reward, 1, evaluateMission("total", [0, 0, 0])), reward);
  assert.equal(awardMissionStar(reward, 2, evaluateMission("high", [100])), reward);
  assert.equal(awardMissionStar(reward, 3, evaluateMission("high", [])), reward);
  assert.equal(awardMissionStar(reward, 4, evaluateMission("high", [100, 0, 0])).stars, 8);
});

test("미션별 진행 상황에 명중 횟수와 총점을 반영한다", () => {
  assert.match(evaluateMission("high", [80, 90]).text, /2회/);
  assert.match(evaluateMission("inside", [0, 10]).text, /판 밖/);
  assert.match(evaluateMission("total", [100, 40]).text, /140점/);
  assert.match(evaluateMission("exact", [60, 70]).text, /1회/);
});
