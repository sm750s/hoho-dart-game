import { MAX_TOTAL_SCORE, TARGET_SCORE } from "./game.ts";
import type { Theme } from "./treasures.ts";

export type ResultImageData = {
  modeName: string;
  aimLabel: string;
  theme: Theme;
  headline: string;
  players: { name: string; difficulty: string; totalScore: number; scores: number[] }[];
  achievement: string;
  detail: string;
  stars: number;
  bestScore: number;
};

const PALETTES = {
  forest: { accent: "#28529c", soft: "#edf3ff", ring: "#398451" },
  sea: { accent: "#087e9a", soft: "#e7f7fa", ring: "#119bc1" },
  space: { accent: "#6950b5", soft: "#f1edff", ring: "#9270d6" },
};
const FONT = '"Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

// 전용 카드로 그려 화면 크기·스크롤·축하 애니메이션과 무관한 PNG를 만듭니다.
export async function createResultImage(data: ResultImageData): Promise<Blob> {
  await document.fonts.ready;
  const family = data.players.length === 2;
  const width = 540;
  const height = family ? 900 : 690;
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 만들 수 없어요.");
  ctx.scale(2, 2);
  const palette = PALETTES[data.theme];

  function box(x: number, y: number, w: number, h: number, color: string, radius = 18) {
    ctx!.fillStyle = color;
    ctx!.beginPath();
    ctx!.roundRect(x, y, w, h, radius);
    ctx!.fill();
  }
  function text(value: string, x: number, y: number, size: number, color = "#243453", bold = false) {
    ctx!.font = `${bold ? 700 : 400} ${size}px ${FONT}`;
    ctx!.fillStyle = color;
    ctx!.fillText(value, x, y);
  }
  function wrapped(value: string, x: number, y: number, maxWidth: number, size: number, color: string, bold = false) {
    ctx!.font = `${bold ? 700 : 400} ${size}px ${FONT}`;
    let line = "";
    const lines: string[] = [];
    for (const char of value) {
      if (ctx!.measureText(line + char).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else line += char;
    }
    lines.push(line);
    lines.slice(0, 2).forEach((item, index) => {
      if (index === 1 && lines.length > 2) {
        while (ctx!.measureText(item + "…").width > maxWidth) item = item.slice(0, -1);
        item += "…";
      }
      text(item, x, y + index * (size + 8), size, color, bold);
    });
  }

  box(0, 0, width, height, "#faf8f2", 0);
  box(20, 20, width - 40, height - 40, "#ffffff", 24);
  // 외부 이미지 없이 다트판 모양의 작은 장식을 그립니다.
  for (const [radius, color] of [[24, palette.ring], [17, "#e3bb84"], [10, palette.ring], [3, "#243453"]] as const) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(66, 66, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  text("호호가족의 다트 게임", 104, 63, 20, "#243453", true);
  text("오늘의 도전을 자랑해요!", 104, 87, 14, "#68758c");
  box(44, 112, 452, 38, palette.soft, 10);
  text(data.modeName, 60, 137, 17, palette.accent, true);
  ctx.textAlign = "right";
  text(data.aimLabel, 480, 137, 14, palette.accent);
  ctx.textAlign = "left";
  wrapped(data.headline, 44, 184, 452, 22, "#243453", true);

  data.players.forEach((player, index) => {
    const y = 226 + index * 220;
    box(44, y, 452, 200, palette.soft);
    wrapped(player.name, 62, y + 30, 310, 18, "#243453", true);
    ctx.textAlign = "right";
    text(player.difficulty, 478, y + 30, 14, palette.accent);
    ctx.textAlign = "left";
    text(String(player.totalScore), 62, y + 104, 58, palette.accent, true);
    text(`/ ${MAX_TOTAL_SCORE}점`, 208, y + 99, 19, "#68758c");
    player.scores.forEach((score, shotIndex) => {
      const x = 62 + shotIndex * 141;
      box(x, y + 125, 132, 58, "#ffffff", 10);
      text(`${shotIndex + 1}번째 다트`, x + 12, y + 147, 12, "#68758c");
      text(`${score}점`, x + 12, y + 172, 21, "#243453", true);
    });
  });
  const badgeY = family ? 670 : 450;
  box(44, badgeY, 452, 90, "#fff4d7");
  wrapped(data.achievement, 62, badgeY + 29, 416, 18, "#725520", true);
  text(data.detail, 62, badgeY + 72, 14, "#725520");
  text(`최고 기록 ${data.bestScore}점`, 44, badgeY + 126, 17, "#243453", true);
  ctx.textAlign = "right";
  text(`모은 별 ${data.stars}개`, 496, badgeY + 126, 17, "#243453", true);
  ctx.textAlign = "left";
  text(`한 사람 세 발 · 목표 ${TARGET_SCORE}점`, 44, badgeY + 154, 14, "#68758c");
  text("함께 만든 게임, 함께 나누는 즐거움", 44, height - 38, 14, palette.accent);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("이미지를 저장할 수 없어요.")), "image/png");
  });
}
