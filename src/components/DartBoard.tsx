import { useId } from "react";
import { BOARD_CENTER, BOARD_SIZE, SCORE_ZONES } from "../game";
import type { Shot } from "../game";
import type { AimState } from "../aim";

import type { Theme, Decoration } from "../treasures";

type DartBoardProps = {
  shots: Shot[];
  aim: AimState;
  theme: Theme;
  decoration: Decoration;
  luckScore?: number;
};

export default function DartBoard({ shots, aim, theme, decoration, luckScore }: DartBoardProps) {
  const titleId = useId();
  const descriptionId = useId();
  const isAiming = aim.phase === "horizontal" || aim.phase === "vertical" || aim.phase === "swirl";
  const progress = 1 - (1 - aim.flightProgress) ** 2;
  const dartX = BOARD_CENTER + (aim.x - BOARD_CENTER) * progress;
  const dartY = 390 + (aim.y - 390) * progress;

  const luckZoneIndex = SCORE_ZONES.findIndex((zone) => zone.score === luckScore);
  const luckOuter = SCORE_ZONES[luckZoneIndex]?.radius;
  const luckInner = SCORE_ZONES[luckZoneIndex - 1]?.radius ?? 0;
  const themeName = { forest: "숲", sea: "바다", space: "우주" }[theme];

  return (
    <div className="board-stage">
      <svg className="dart-board" viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`} role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <title id={titleId}>{`${themeName} 테마 동심원 다트판`}</title>
        <desc id={descriptionId}>두 색상이 번갈아 나타나는 10개 점수 영역입니다. 가장 작은 중심점은 100점이고 바깥으로 갈수록 10점씩 줄어 가장 바깥 띠는 10점입니다. 테두리와 판 밖은 0점입니다.</desc>
        <circle className="board-frame" cx="200" cy="200" r="190" />
        {[...SCORE_ZONES].reverse().map((zone, index) => (
          <circle key={zone.score} className={zone.score === 100 ? "center-dot" : index % 2 === 0 ? "board-green" : "board-brown"}
            cx={BOARD_CENTER} cy={BOARD_CENTER} r={zone.radius} />
        ))}
        {luckOuter !== undefined && <circle className="luck-zone" cx={BOARD_CENTER} cy={BOARD_CENTER} r={(luckOuter + luckInner) / 2} strokeWidth={luckOuter - luckInner} />}
        <g className="shot-markers" aria-hidden="true">
          {shots.map((shot) => (
            <g key={shot.id} transform={`translate(${shot.x} ${shot.y})`}>
              <circle className={shot.id === shots.length ? "shot-dot shot-dot-latest" : "shot-dot"} r="6" />
              {decoration === "star" && <path className="star-decoration" d="M 0 -12 L 3 -4 L 12 -4 L 5 2 L 8 11 L 0 6 L -8 11 L -5 2 L -12 -4 L -3 -4 Z" />}
              <path d="M -9 0 H 9 M 0 -9 V 9" />
              {shot.id === shots.length && <circle className="impact-ring" r="12" />}
            </g>
          ))}
        </g>
        {isAiming && (
          <g className="aim-marker" aria-hidden="true">
            {aim.phase !== "swirl" && <path className="aim-guide" d={aim.phase === "horizontal" ? `M ${aim.x} 0 V 400` : `M ${aim.x} 0 V 400 M 0 ${aim.y} H 400`} />}
            <g transform={`translate(${aim.x} ${aim.y})`}>
              <circle r="14" />
              <path d="M -20 0 H -6 M 6 0 H 20 M 0 -20 V -6 M 0 6 V 20" />
            </g>
          </g>
        )}
        {aim.phase === "flying" && (
          <g className="flying-dart" transform={`translate(${dartX} ${dartY}) scale(${1.8 - progress * 0.8})`} aria-hidden="true">
            <path className="dart-shaft" d="M 0 0 L -20 26" />
            <path className="dart-flight" d="M -12 16 L -29 19 L -26 34 L -16 27 Z" />
            <circle r="3" />
            {decoration === "star" && <path className="star-decoration" d="M -20 10 L -17 18 L -8 18 L -15 24 L -12 33 L -20 28 L -28 33 L -25 24 L -32 18 L -23 18 Z" />}
          </g>
        )}
      </svg>
    </div>
  );
}
