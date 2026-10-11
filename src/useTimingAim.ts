import { useEffect, useRef, useState } from "react";
import { advanceAim, createAim, finishFlight, INITIAL_AIM, lockAim } from "./aim";
import type { AimPattern, AimState, Difficulty } from "./aim";
import type { Point } from "./game";

type TimingOptions = {
  pattern?: AimPattern;
  enabled?: boolean;
  remainingShots: number;
  onLaunch: (point: Point) => void;
  onLand: (point: Point) => void;
};

export function useTimingAim(options: TimingOptions) {
  const [aim, setAim] = useState(INITIAL_AIM);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const aimRef = useRef(INITIAL_AIM);
  const optionsRef = useRef(options);
  const difficultyRef = useRef(difficulty);
  optionsRef.current = options;

  function updateAim(next: AimState) {
    aimRef.current = next;
    setAim(next);
  }

  function act() {
    if (optionsRef.current.enabled === false) return;
    const current = aimRef.current;
    const next = lockAim(current);
    if (next === current) return;
    // 즉시 잠가 렌더링 전 연속 입력도 같은 다트를 두 번 던지지 못하게 합니다.
    updateAim(next);
    if (next.phase === "flying") optionsRef.current.onLaunch({ x: next.x, y: next.y });
  }

  function resetAim() {
    updateAim(createAim(optionsRef.current.pattern ?? "axes"));
  }

  function changeDifficulty(next: Difficulty) {
    if (aimRef.current.phase === "flying") return;
    difficultyRef.current = next;
    setDifficulty(next);
  }

  useEffect(() => {
    let frame = 0;
    let previousTime: number | undefined;

    function animate(time: number) {
      // 다른 탭에서 돌아왔을 때 갑자기 조준점이 크게 이동하지 않게 합니다.
      const delta = previousTime === undefined ? 0 : Math.min(time - previousTime, 50);
      previousTime = time;
      const next = optionsRef.current.enabled === false ? aimRef.current : advanceAim(aimRef.current, delta, difficultyRef.current);
      if (next.phase === "flying" && next.flightProgress >= 1) {
        updateAim(finishFlight(next, optionsRef.current.remainingShots === 1, createAim(optionsRef.current.pattern ?? "axes")));
        optionsRef.current.onLand({ x: next.x, y: next.y });
      } else if (next !== aimRef.current) {
        updateAim(next);
      }
      frame = requestAnimationFrame(animate);
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.code !== "Space") return;
      const target = event.target;
      // 버튼은 브라우저의 기본 Space 동작에 맡겨 중복 실행을 피합니다.
      if (target instanceof HTMLElement && target.closest("button, select, input, textarea, a, [contenteditable]")) {
        if (event.repeat && target.closest(".aim-button")) event.preventDefault();
        return;
      }
      event.preventDefault();
      if (!event.repeat) act();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return { aim, difficulty, act, resetAim, changeDifficulty };
}
