export type Difficulty = "easy" | "normal" | "fast" | "veryFast";
export type AimPattern = "axes" | "swirl";
export const AIM_PATTERN_LABELS = { axes: "가로·세로 조준", swirl: "회오리 조준" };
export type AimPhase = "horizontal" | "vertical" | "swirl" | "flying" | "finished";
export type AimState = {
  phase: AimPhase;
  x: number;
  y: number;
  direction: number;
  flightProgress: number;
  swirlTime?: number;
  swirlSeed?: number;
};

export const AIM_MIN = 12;
export const AIM_MAX = 388;
export const FLIGHT_DURATION = 450;
export const AIM_SPEED: Record<Difficulty, number> = {
  easy: 150,
  normal: 270,
  fast: 420,
  veryFast: 600,
};
export const INITIAL_AIM: AimState = {
  phase: "horizontal", x: AIM_MIN, y: 200, direction: 1, flightProgress: 0,
};

export function createAim(pattern: AimPattern, random: () => number = Math.random): AimState {
  if (pattern === "axes") return INITIAL_AIM;
  return advanceAim({ ...INITIAL_AIM, phase: "swirl", swirlTime: 0, swirlSeed: random() * Math.PI * 2 }, 0, "easy");
}

export function lockAim(state: AimState): AimState {
  if (state.phase === "horizontal") return { ...state, phase: "vertical", y: AIM_MIN, direction: 1 };
  if (state.phase === "vertical" || state.phase === "swirl") return { ...state, phase: "flying", flightProgress: 0 };
  return state;
}

export function advanceAim(state: AimState, milliseconds: number, difficulty: Difficulty): AimState {
  if (state.phase === "finished") return state;
  if (state.phase === "flying") {
    return { ...state, flightProgress: Math.min(1, state.flightProgress + milliseconds / FLIGHT_DURATION) };
  }

  if (state.phase === "swirl") {
    const time = (state.swirlTime ?? 0) + milliseconds / 1000 * AIM_SPEED[difficulty] / AIM_SPEED.easy;
    const seed = state.swirlSeed ?? 0;
    // 중심으로 수축하는 대신 두 회전을 합칩니다. 주 회전의 최저 속도를
    // 보조 회전의 최고 속도보다 크게 유지해 중심에서도 움직임이 상쇄되지 않습니다.
    const angle = seed + time * 3.6 + 0.32 * Math.sin(time * 1.7 + seed) + 0.16 * Math.sin(time * 2.9);
    const radius = 76 + 16 * Math.sin(time * 0.63 + seed);
    const offsetAngle = seed * Math.SQRT2 - time * 1.1 + 0.3 * Math.sin(time * 0.83 + seed);
    return { ...state, swirlTime: time,
      x: 200 + 92 * Math.cos(angle) + radius * Math.cos(offsetAngle),
      y: 200 + 92 * Math.sin(angle) + radius * Math.sin(offsetAngle),
    };
  }

  const axis = state.phase === "horizontal" ? "x" : "y";
  const range = AIM_MAX - AIM_MIN;
  // 삼각파로 왕복시켜 프레임 수와 관계없이 같은 속도를 유지합니다.
  const travelled = state.direction === 1 ? state[axis] - AIM_MIN : 2 * range - (state[axis] - AIM_MIN);
  const cycle = (travelled + AIM_SPEED[difficulty] * milliseconds / 1000) % (2 * range);
  const position = cycle <= range ? AIM_MIN + cycle : AIM_MAX - (cycle - range);
  return { ...state, [axis]: position, direction: cycle < range ? 1 : -1 };
}

export function finishFlight(state: AimState, isLastShot: boolean, nextAim = INITIAL_AIM): AimState {
  if (state.phase !== "flying" || state.flightProgress < 1) return state;
  return isLastShot ? { ...state, phase: "finished" } : nextAim;
}
