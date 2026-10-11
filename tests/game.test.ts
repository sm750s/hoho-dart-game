import assert from "node:assert/strict";
import test from "node:test";
import { calculateScore, getResultMessage, INITIAL_GAME_STATE, gameReducer, MAX_SHOTS, TARGET_SCORE, toBoardPoint } from "../src/game.ts";

test("중심부터 판 밖까지 100점에서 0점으로 10점씩 줄어든다", () => {
  for (const [distance, expected] of [[0, 100], [3, 100], [15, 90], [35, 80], [55, 70], [75, 60], [95, 50], [115, 40], [135, 30], [150, 20], [170, 10], [185, 0], [220, 0]]) {
    assert.equal(calculateScore({ x: 200 + distance, y: 200 }), expected);
  }
  assert.equal(calculateScore({ x: 310, y: 310 }), 20);
  assert.equal(calculateScore({ x: 340, y: 340 }), 0);
});

test("영역 경계는 안쪽 점수이며 바로 밖은 다음 영역이다", () => {
  for (const [radius, insideScore, outsideScore] of [[6, 100, 90], [24, 90, 80], [43, 80, 70], [62, 70, 60], [81, 60, 50], [100, 50, 40], [119, 40, 30], [138, 30, 20], [157, 20, 10], [178, 10, 0]]) {
    for (const direction of [-1, 1]) {
      assert.equal(calculateScore({ x: 200 + direction * radius, y: 200 }), insideScore);
      assert.equal(calculateScore({ x: 200, y: 200 + direction * radius }), insideScore);
      assert.equal(calculateScore({ x: 200 + direction * (radius + 0.01), y: 200 }), outsideScore);
    }
  }
});

test("화면 크기와 위치가 달라도 같은 상대 위치는 같은 점수이다", () => {
  for (const size of [180, 280, 380, 760]) {
    const rect = { left: 30, top: 70, width: size, height: size };
    const point = toBoardPoint({ x: 30 + size * 0.925, y: 70 + size * 0.5 }, rect);
    assert.deepEqual(point, { x: 370, y: 200 });
    assert.equal(calculateScore(point), 10);
    const outside = toBoardPoint({ x: 30 - 10, y: 70 + size / 2 }, rect);
    assert.equal(calculateScore(outside), 0);
  }
});

test("세 발의 점수를 합산하고 세 번째 발 이후 연속 입력을 차단한다", () => {
  let state = INITIAL_GAME_STATE;
  for (const x of [200, 260, 370]) {
    state = gameReducer(state, { type: "throw", point: { x, y: 200 } });
  }
  assert.equal(state.totalScore, 180);
  assert.equal(state.shots.length, MAX_SHOTS);
  assert.deepEqual(state.shots.map((shot) => shot.score), [100, 70, 10]);
  const finished = state;
  for (let i = 0; i < 20; i++) {
    state = gameReducer(state, { type: "throw", point: { x: 200, y: 200 } });
    assert.equal(state, finished);
  }
  assert.deepEqual(INITIAL_GAME_STATE, { shots: [], totalScore: 0 });
});

test("진행 중 다시 하기는 점수와 모든 명중 표시를 지우고 새 판을 시작한다", () => {
  const thrown = gameReducer(INITIAL_GAME_STATE, { type: "throw", point: { x: 200, y: 200 } });
  const reset = gameReducer(thrown, { type: "reset" });
  assert.deepEqual(reset, { shots: [], totalScore: 0 });
  assert.deepEqual(gameReducer(reset, { type: "reset" }), reset);
  const next = gameReducer(reset, { type: "throw", point: { x: 370, y: 200 } });
  assert.equal(next.totalScore, 10);
  assert.equal(next.shots[0].id, 1);
});

test("판 밖으로 던져도 한 발이 소모되며 세 번 빗나가면 0점으로 종료된다", () => {
  let state = INITIAL_GAME_STATE;
  for (let i = 0; i < MAX_SHOTS; i++) {
    state = gameReducer(state, { type: "throw", point: { x: 0, y: 0 } });
    assert.equal(state.shots.length, i + 1);
    assert.equal(state.shots.at(-1)?.score, 0);
    assert.equal(state.totalScore, 0);
  }
  assert.equal(gameReducer(state, { type: "throw", point: { x: 200, y: 200 } }), state);
});

test("종료 후 다시 하기는 새 판에서 세 발을 다시 던질 수 있게 한다", () => {
  let state = INITIAL_GAME_STATE;
  for (let i = 0; i < MAX_SHOTS; i++) {
    state = gameReducer(state, { type: "throw", point: { x: 200, y: 200 } });
  }
  assert.equal(state.totalScore, 300);
  state = gameReducer(state, { type: "reset" });
  assert.deepEqual(state, { shots: [], totalScore: 0 });
  for (let i = 0; i < MAX_SHOTS; i++) {
    state = gameReducer(state, { type: "throw", point: { x: 370, y: 200 } });
    assert.equal(state.shots.at(-1)?.id, i + 1);
  }
  assert.equal(state.totalScore, 30);
  assert.equal(state.shots.length, MAX_SHOTS);
});

test("결과 메시지는 0점, 목표 미달, 목표 달성, 만점을 구분한다", () => {
  assert.match(getResultMessage(0), /괜찮아요/);
  assert.match(getResultMessage(TARGET_SCORE - 10), /다음 판/);
  assert.match(getResultMessage(TARGET_SCORE), /목표 달성/);
  assert.match(getResultMessage(300), /세 발 모두 정중앙/);
});
