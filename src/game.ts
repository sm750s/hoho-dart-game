export const BOARD_SIZE = 400;
export const BOARD_CENTER = BOARD_SIZE / 2;
export const BOARD_RADIUS = 178;
// 중심부터 바깥쪽 순서입니다. 그림과 점수 계산이 같은 정의를 사용합니다.
export const SCORE_ZONES = [
  { radius: 6, score: 100 },
  { radius: 24, score: 90 },
  { radius: 43, score: 80 },
  { radius: 62, score: 70 },
  { radius: 81, score: 60 },
  { radius: 100, score: 50 },
  { radius: 119, score: 40 },
  { radius: 138, score: 30 },
  { radius: 157, score: 20 },
  { radius: BOARD_RADIUS, score: 10 },
] as const;
export const MAX_SHOT_SCORE = SCORE_ZONES[0].score;
export const MAX_SHOTS = 3;
export const MAX_TOTAL_SCORE = MAX_SHOTS * MAX_SHOT_SCORE;
// 아이와 함께 목표 점수와 결과 문구를 바꿔 보세요.
export const TARGET_SCORE = 180;

export type Point = { x: number; y: number };
export type Shot = Point & { id: number; score: number };
export type GameState = { shots: Shot[]; totalScore: number };
export type GameAction = { type: "throw"; point: Point } | { type: "reset" };

export const INITIAL_GAME_STATE: GameState = { shots: [], totalScore: 0 };

export function calculateScore(point: Point): number {
  const distance = Math.hypot(point.x - BOARD_CENTER, point.y - BOARD_CENTER);

  // 경계에 맞으면 안쪽 영역의 점수를 줍니다.
  return SCORE_ZONES.find((zone) => distance <= zone.radius)?.score ?? 0;
}

export function toBoardPoint(
  clientPoint: Point,
  boardRect: { left: number; top: number; width: number; height: number },
): Point {
  // 화면 크기가 달라도 SVG의 400 × 400 좌표로 계산합니다.
  return {
    x: ((clientPoint.x - boardRect.left) / boardRect.width) * BOARD_SIZE,
    y: ((clientPoint.y - boardRect.top) / boardRect.height) * BOARD_SIZE,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "reset") return INITIAL_GAME_STATE;
  // 연속 입력이 들어와도 세 번째 발 이후에는 기록과 점수가 바뀌지 않습니다.
  if (state.shots.length >= MAX_SHOTS) return state;

  const score = calculateScore(action.point);
  const shot: Shot = { ...action.point, id: state.shots.length + 1, score };

  return {
    shots: [...state.shots, shot],
    totalScore: state.totalScore + score,
  };
}

export function getResultMessage(totalScore: number): string {
  if (totalScore === MAX_TOTAL_SCORE) return "세 발 모두 정중앙! 멋진 집중력이에요!";
  if (totalScore >= TARGET_SCORE) return "목표 달성! 정말 잘했어요!";
  if (totalScore > 0) return "잘 도전했어요! 다음 판에는 목표 점수를 노려 봐요.";
  return "괜찮아요! 다음 판에는 중심을 향해 도전해 봐요.";
}
