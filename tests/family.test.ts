import assert from "node:assert/strict";
import test from "node:test";
import { familyReducer, familyResult, INITIAL_FAMILY_STATE, playerName } from "../src/family.ts";
import type { FamilyState } from "../src/family.ts";

function throwThree(state: FamilyState, x: number): FamilyState {
  for (let i = 0; i < 3; i++) state = familyReducer(state, { type: "land", point: { x, y: 200 } });
  return state;
}

test("설정에서 이름과 개인 속도를 정하고 빈 이름에는 기본 이름을 사용한다", () => {
  let state = familyReducer(INITIAL_FAMILY_STATE, { type: "configure", index: 0, name: " 아이 ", difficulty: "easy" });
  state = familyReducer(state, { type: "configure", index: 1, name: "   ", difficulty: "veryFast" });
  assert.equal(playerName(state.players[0], 0), "아이");
  assert.equal(playerName(state.players[1], 1), "플레이어 2");
  assert.equal(state.players[1].difficulty, "veryFast");
  assert.equal(familyReducer(state, { type: "land", point: { x: 200, y: 200 } }), state);
  state = familyReducer(state, { type: "start" });
  assert.equal(state.phase, "playing");
  assert.equal(familyReducer(state, { type: "configure", index: 0, name: "변경" }), state);
});

test("각자 세 발을 던지고 차례 사이 입력은 무시하며 명시적으로 넘긴다", () => {
  const started = familyReducer(INITIAL_FAMILY_STATE, { type: "start" });
  assert.equal(familyReducer(started, { type: "next" }), started);
  const first = throwThree(started, 200);
  assert.equal(first.phase, "handoff");
  assert.equal(first.active, 0);
  assert.equal(first.players[0].game.totalScore, 300);
  assert.equal(first.players[1].game.shots.length, 0);
  assert.equal(familyReducer(first, { type: "land", point: { x: 200, y: 200 } }), first);
  const second = familyReducer(first, { type: "next" });
  assert.equal(second.active, 1);
  assert.equal(second.phase, "playing");
  assert.equal(second.players[0].game.shots.length, 3);
  const ended = throwThree(second, 370);
  assert.equal(ended.phase, "finished");
  assert.equal(ended.players[1].game.totalScore, 30);
  assert.equal(ended.players[1].game.shots.length, 3);
  assert.equal(familyReducer(ended, { type: "land", point: { x: 200, y: 200 } }), ended);
  assert.equal(familyReducer(ended, { type: "next" }), ended);
  assert.match(familyResult(ended), /플레이어 1 승리/);
});

test("두 번째 플레이어 승리와 동점을 판정한다", () => {
  const first = throwThree(familyReducer(INITIAL_FAMILY_STATE, { type: "start" }), 0);
  const second = familyReducer(first, { type: "next" });
  assert.equal(familyResult(second), "");
  assert.match(familyResult(throwThree(second, 200)), /플레이어 2 승리/);
  assert.match(familyResult(throwThree(second, 0)), /공동 승리/);
});

test("중도·차례 대기·종료 후 재시작은 두 사람 점수를 지우고 이름과 속도를 유지한다", () => {
  const configured = familyReducer(INITIAL_FAMILY_STATE, { type: "configure", index: 0, name: "가족", difficulty: "fast" });
  const playing = familyReducer(configured, { type: "start" });
  const partial = familyReducer(playing, { type: "land", point: { x: 200, y: 200 } });
  const waiting = throwThree(playing, 200);
  const finished = throwThree(familyReducer(waiting, { type: "next" }), 200);
  for (const current of [partial, waiting, finished]) {
    const reset = familyReducer(current, { type: "restart" });
    assert.equal(reset.phase, "setup");
    assert.equal(reset.active, 0);
    assert.equal(reset.players[0].name, "가족");
    assert.equal(reset.players[0].difficulty, "fast");
    for (const player of reset.players) assert.deepEqual(player.game, { shots: [], totalScore: 0 });
  }
  assert.equal(INITIAL_FAMILY_STATE.players[0].game.shots.length, 0);
});

test("판 밖 투척도 횟수를 소모하며 기록은 개인 점수 단위로 유지한다", () => {
  let state = throwThree(familyReducer(INITIAL_FAMILY_STATE, { type: "start" }), 260);
  assert.equal(state.players[0].game.totalScore, 210);
  state = throwThree(familyReducer(state, { type: "next" }), 0);
  assert.equal(state.players[1].game.shots.length, 3);
  assert.equal(state.players[1].game.totalScore, 0);
  assert.equal(Math.max(...state.players.map((player) => player.game.totalScore)), 210);
});
