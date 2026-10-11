import assert from "node:assert/strict";
import test from "node:test";
import { advanceAim, AIM_MAX, AIM_MIN, createAim, finishFlight, FLIGHT_DURATION, INITIAL_AIM, lockAim } from "../src/aim.ts";
import { gameReducer, INITIAL_GAME_STATE } from "../src/game.ts";
import type { Difficulty } from "../src/aim.ts";

test("회오리는 중심 부근에서도 쉬움 기준 초당 100 이상 계속 이동한다", () => {
  let centerSamples = 0;
  for (const seed of [0, 0.17, 0.5, 0.75, 0.93]) {
    const initial = createAim("swirl", () => seed);
    for (let t = 0; t < 120000; t += 10) {
      const current = advanceAim(initial, t, "easy");
      const next = advanceAim(initial, t + 10, "easy");
      const speed = Math.hypot(next.x - current.x, next.y - current.y) / 0.01;
      assert.ok(speed > 100, `중심 정체 회귀: seed=${seed}, time=${t}, speed=${speed}`);
      if (Math.hypot(current.x - 200, current.y - 200) < 24) centerSamples += 1;
    }
  }
  assert.ok(centerSamples > 100, "중심 영역도 지나가면서 검증해야 합니다.");
});

test("회오리는 화면 범위를 지키며 양 축으로 움직이고 프레임 분할에도 같은 경로다", () => {
  for (const seed of [0, 0.23, 0.75]) {
    const initial = createAim("swirl", () => seed);
    let split = initial;
    for (let i = 0; i < 40; i++) split = advanceAim(split, 25, "normal");
    const whole = advanceAim(initial, 1000, "normal");
    assert.ok(Math.abs(split.x - whole.x) < 1e-9);
    assert.ok(Math.abs(split.y - whole.y) < 1e-9);
    assert.notEqual(whole.x, initial.x);
    assert.notEqual(whole.y, initial.y);
    for (const difficulty of ["easy", "normal", "fast", "veryFast"] as const) {
      for (let t = 0; t <= 60000; t += 113) {
        const next = advanceAim(initial, t, difficulty);
        assert.ok(next.x >= AIM_MIN && next.x <= AIM_MAX);
        assert.ok(next.y >= AIM_MIN && next.y <= AIM_MAX);
      }
    }
  }
});

test("회오리 한 번 입력은 좌표를 고정하며 비행 중 입력을 막고 다음 발도 회오리다", () => {
  const moving = advanceAim(createAim("swirl", () => 0.3), 800, "easy");
  const flying = lockAim(moving);
  assert.equal(flying.phase, "flying");
  assert.equal(lockAim(flying), flying);
  const landed = advanceAim(flying, FLIGHT_DURATION, "veryFast");
  assert.equal(landed.x, moving.x);
  assert.equal(landed.y, moving.y);
  const next = createAim("swirl", () => 0.8);
  assert.equal(finishFlight(landed, false, next), next);
  const finished = finishFlight(landed, true, next);
  assert.equal(finished.phase, "finished");
  assert.equal(lockAim(finished), finished);
  assert.equal(createAim("axes"), INITIAL_AIM);
});

test("회오리 난이도는 같은 경로의 속도를 바꾸고 새 발은 다른 출발 위치를 가진다", () => {
  const initial = createAim("swirl", () => 0.2);
  const fast = advanceAim(initial, 1000, "veryFast");
  const easy = advanceAim(initial, 2800, "easy");
  assert.equal(fast.x, easy.x);
  assert.equal(fast.y, easy.y);
  for (const [difficulty, multiplier] of [["easy", 1], ["normal", 1.3], ["fast", 1.8], ["veryFast", 2.8]] as const) {
    const adjusted = advanceAim(initial, 1000, difficulty);
    const baseline = advanceAim(initial, 1000 * multiplier, "easy");
    assert.ok(Math.abs(adjusted.x - baseline.x) < 1e-9);
    assert.ok(Math.abs(adjusted.y - baseline.y) < 1e-9);
  }
  assert.notEqual(createAim("swirl", () => 0.7).x, initial.x);
});

test("첫 조작은 가로를 고정하고 두 번째 조작은 세로를 고정해 비행을 시작한다", () => {
  const horizontal = advanceAim(INITIAL_AIM, 1000, "easy");
  const vertical = lockAim(horizontal);
  assert.equal(vertical.phase, "vertical");
  assert.equal(vertical.x, horizontal.x);
  const moved = advanceAim(vertical, 900, "easy");
  assert.equal(moved.x, vertical.x);
  assert.ok(moved.y > vertical.y);
  const flying = lockAim(moved);
  assert.equal(flying.phase, "flying");
  assert.equal(flying.x, moved.x);
  assert.equal(flying.y, moved.y);
  assert.equal(flying.flightProgress, 0);
  for (let i = 0; i < 20; i++) assert.equal(lockAim(flying), flying);
});

test("네 난이도의 속도가 순서대로 증가하며 프레임을 나누어도 위치가 같다", () => {
  const difficulties: Difficulty[] = ["easy", "normal", "fast", "veryFast"];
  let previousX = AIM_MIN;
  for (const difficulty of difficulties) {
    const next = advanceAim(INITIAL_AIM, 500, difficulty);
    assert.ok(next.x > previousX);
    previousX = next.x;
    let split = INITIAL_AIM;
    for (let i = 0; i < 10; i++) split = advanceAim(split, 50, difficulty);
    assert.equal(split.x, next.x);
  }
});

test("긴 시간이 지나도 조준점은 범위 안에서 왕복한다", () => {
  for (const difficulty of ["easy", "normal", "fast", "veryFast"] as const) {
    for (const milliseconds of [0, 2500, 8000, 123456]) {
      const next = advanceAim(INITIAL_AIM, milliseconds, difficulty);
      assert.ok(next.x >= AIM_MIN && next.x <= AIM_MAX);
    }
  }
  const reversed = advanceAim(INITIAL_AIM, 2600, "easy");
  assert.equal(reversed.direction, -1);
  assert.ok(advanceAim(reversed, 100, "easy").x < reversed.x);
});

test("착지 전에는 다음 조준으로 넘어가지 않고 마지막 착지 후 조작을 차단한다", () => {
  const flying = lockAim(lockAim(INITIAL_AIM));
  const halfway = advanceAim(flying, FLIGHT_DURATION / 2, "easy");
  assert.equal(finishFlight(halfway, false), halfway);
  const landed = advanceAim(halfway, FLIGHT_DURATION, "easy");
  assert.equal(landed.flightProgress, 1);
  assert.equal(finishFlight(landed, false), INITIAL_AIM);
  const finished = finishFlight(landed, true);
  assert.equal(finished.phase, "finished");
  assert.equal(lockAim(finished), finished);
  assert.equal(advanceAim(finished, 1000, "easy"), finished);
});

test("세 발은 각각 착지 후 기록하고 재시작은 조준과 게임을 초기화한다", () => {
  let game = INITIAL_GAME_STATE;
  let aim = INITIAL_AIM;
  for (let i = 0; i < 3; i++) {
    aim = lockAim(advanceAim(aim, 1000, "easy"));
    aim = lockAim(advanceAim(aim, 1000, "easy"));
    assert.equal(game.shots.length, i);
    aim = advanceAim(aim, FLIGHT_DURATION, "easy");
    game = gameReducer(game, { type: "throw", point: { x: aim.x, y: aim.y } });
    aim = finishFlight(aim, i === 2);
    assert.equal(game.shots.length, i + 1);
  }
  assert.equal(aim.phase, "finished");
  game = gameReducer(game, { type: "reset" });
  aim = INITIAL_AIM;
  assert.equal(game.shots.length, 0);
  assert.equal(aim.phase, "horizontal");
  assert.equal(advanceAim(aim, 50, "easy").flightProgress, 0);
});
