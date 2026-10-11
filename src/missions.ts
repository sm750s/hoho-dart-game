import { MAX_SHOTS } from "./game.ts";

export const MISSIONS = [
  { id: "high", name: "높은 곳을 노려라", description: "한 발 이상 80점 이상 맞히기" },
  { id: "inside", name: "모두 판 안으로", description: "세 발 모두 10점 이상 맞히기" },
  { id: "total", name: "180점 도전", description: "세 발의 합계 180점 이상 얻기" },
  { id: "exact", name: "60점을 찾아라", description: "한 발 이상 정확히 60점 맞히기" },
] as const;

export type MissionId = typeof MISSIONS[number]["id"];
export type MissionProgress = { complete: boolean; conditionMet: boolean; success: boolean; text: string };
export type StarReward = { stars: number; rewardedRound: number | null };

export function evaluateMission(id: MissionId, scores: readonly number[]): MissionProgress {
  const complete = scores.length === MAX_SHOTS;
  const total = scores.reduce((sum, score) => sum + score, 0);
  let conditionMet: boolean;
  let text: string;
  switch (id) {
    case "high": {
      const hits = scores.filter((score) => score >= 80).length;
      conditionMet = hits > 0;
      text = `80점 이상 명중 ${hits}회 / 1회`;
      break;
    }
    case "inside": {
      const hits = scores.filter((score) => score >= 10).length;
      conditionMet = complete && hits === MAX_SHOTS;
      text = `판 안 명중 ${hits}발 / ${MAX_SHOTS}발${scores.includes(0) ? " · 판 밖 명중이 있어요" : ""}`;
      break;
    }
    case "total":
      conditionMet = total >= 180;
      text = `총점 ${total}점 / 180점`;
      break;
    case "exact": {
      const hits = scores.filter((score) => score === 60).length;
      conditionMet = hits > 0;
      text = `정확히 60점 명중 ${hits}회 / 1회`;
      break;
    }
  }
  return { complete, conditionMet, success: complete && conditionMet, text };
}

export function awardMissionStar(reward: StarReward, round: number, progress: MissionProgress): StarReward {
  if (!progress.success || reward.rewardedRound === round) return reward;
  return { stars: reward.stars + 1, rewardedRound: round };
}
