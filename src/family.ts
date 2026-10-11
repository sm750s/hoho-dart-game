import { gameReducer, INITIAL_GAME_STATE, MAX_SHOTS } from "./game.ts";
import type { GameState, Point } from "./game.ts";
import type { Difficulty } from "./aim.ts";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "쉬움", normal: "보통", fast: "빠름", veryFast: "매우 빠름",
};
export type Player = { name: string; difficulty: Difficulty; game: GameState };
export type FamilyState = {
  players: [Player, Player];
  active: 0 | 1;
  phase: "setup" | "playing" | "handoff" | "finished";
};
export type FamilyAction =
  | { type: "configure"; index: 0 | 1; name?: string; difficulty?: Difficulty }
  | { type: "start" }
  | { type: "land"; point: Point }
  | { type: "next" }
  | { type: "restart" };

export const INITIAL_FAMILY_STATE: FamilyState = {
  players: [
    { name: "", difficulty: "easy", game: INITIAL_GAME_STATE },
    { name: "", difficulty: "normal", game: INITIAL_GAME_STATE },
  ],
  active: 0,
  phase: "setup",
};

export function playerName(player: Player, index: number): string {
  return player.name.trim() || `플레이어 ${index + 1}`;
}

export function familyReducer(state: FamilyState, action: FamilyAction): FamilyState {
  if (action.type === "restart") {
    return { ...state, active: 0, phase: "setup", players: state.players.map((player) => ({ ...player, game: INITIAL_GAME_STATE })) as [Player, Player] };
  }
  if (action.type === "configure") {
    if (state.phase !== "setup") return state;
    const players: [Player, Player] = [...state.players];
    players[action.index] = {
      ...players[action.index],
      ...(action.name !== undefined ? { name: action.name.slice(0, 20) } : {}),
      ...(action.difficulty !== undefined ? { difficulty: action.difficulty } : {}),
    };
    return { ...state, players };
  }
  if (action.type === "start") return state.phase === "setup" ? { ...state, phase: "playing" } : state;
  if (action.type === "next") return state.phase === "handoff" ? { ...state, phase: "playing", active: 1 } : state;
  if (state.phase !== "playing") return state;
  const players: [Player, Player] = [...state.players];
  const player = players[state.active];
  const game = gameReducer(player.game, { type: "throw", point: action.point });
  if (game === player.game) return state;
  players[state.active] = { ...player, game };
  const phase = game.shots.length < MAX_SHOTS ? "playing" : state.active === 0 ? "handoff" : "finished";
  return { ...state, players, phase };
}

export function familyResult(state: FamilyState): string {
  if (state.phase !== "finished") return "";
  const [first, second] = state.players;
  if (first.game.totalScore === second.game.totalScore) return "동점! 두 사람 모두 공동 승리예요!";
  const index = first.game.totalScore > second.game.totalScore ? 0 : 1;
  return `${playerName(state.players[index], index)} 승리! 서로의 도전을 응원해 주세요.`;
}
