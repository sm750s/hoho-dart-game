import { useEffect, useReducer, useRef, useState } from "react";
import DartBoard from "./components/DartBoard";
import { calculateScore, getResultMessage, INITIAL_GAME_STATE, gameReducer, MAX_SHOTS, MAX_TOTAL_SCORE, SCORE_ZONES, TARGET_SCORE } from "./game";
import type { Point } from "./game";
import { SoundEffects } from "./sound";
import { useTimingAim } from "./useTimingAim";
import { AIM_PATTERN_LABELS } from "./aim";
import type { AimPattern } from "./aim";
import { FLIGHT_DURATION } from "./aim";
import { deleteBestScore, readBestScore, readMissionStars, saveBestScore, saveMissionStars, readCosmetics, saveCosmetics } from "./storage";
import Celebration from "./components/Celebration";
import { awardMissionStar, evaluateMission, MISSIONS } from "./missions";
import type { MissionId, StarReward } from "./missions";
import { DIFFICULTY_LABELS, familyReducer, familyResult, INITIAL_FAMILY_STATE, playerName } from "./family";
import FamilyPanel from "./components/FamilyPanel";
import TreasurePanel from "./components/TreasurePanel";
import { DEFAULT_COSMETICS, restoreCosmetics } from "./treasures";
import type { Cosmetics } from "./treasures";
import { drawLuckScore, hasLuckHit } from "./luck";
import ResultImageSave from "./components/ResultImageSave";
import ChoiceCards, { DifficultyCards } from "./components/ChoiceCards";
type Screen = "home" | "playing" | "result";
type GameMode = "basic" | "mission" | "family" | "luck";

export default function App() {
  const [singleState, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [family, dispatchFamily] = useReducer(familyReducer, INITIAL_FAMILY_STATE);
  const [screen, setScreen] = useState<Screen>("home");
  const [aimPattern, setAimPattern] = useState<AimPattern>("axes");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [mode, setMode] = useState<GameMode>("basic");
  const state = mode === "family" ? family.players[family.active].game : singleState;
  const lastShot = state.shots.at(-1);
  const remainingShots = MAX_SHOTS - state.shots.length;
  const isFinished = remainingShots === 0;
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef = useRef<SoundEffects | null>(null);
  const [bestRecord, setBestRecord] = useState(readBestScore);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [recordMessage, setRecordMessage] = useState("");
  const [missionId, setMissionId] = useState<MissionId>("high");
  const [starRecord, setStarRecord] = useState(readMissionStars);
  const [cosmeticRecord, setCosmeticRecord] = useState(() => readCosmetics(starRecord.stars));
  const [confirmReset, setConfirmReset] = useState(false);
  const [treasureMessage, setTreasureMessage] = useState("");
  const [luckScore, setLuckScore] = useState(100);
  const luckHit = mode === "luck" && hasLuckHit(luckScore, state.shots.map((shot) => shot.score));
  const rewardRef = useRef<StarReward>({ stars: starRecord.stars, rewardedRound: null });
  const roundRef = useRef(1);
  const progress = evaluateMission(missionId, state.shots.map((shot) => shot.score));
  const mission = MISSIONS.find((item) => item.id === missionId)!;

  useEffect(() => () => {
    soundRef.current?.dispose();
    soundRef.current = null;
  }, []);

  function playThrowSound(point: Point) {
    if (isFinished) return;
    if (soundEnabled) {
      soundRef.current ??= new SoundEffects();
      void soundRef.current.playThrow(calculateScore(point), remainingShots === 1, FLIGHT_DURATION / 1000);
    }
  }

  const { aim, difficulty, act, resetAim, changeDifficulty } = useTimingAim({
    pattern: aimPattern,
    enabled: screen === "playing" && !confirmReset && (mode !== "family" || family.phase === "playing"),
    remainingShots,
    onLaunch: playThrowSound,
    onLand: (point) => {
      if (screen !== "playing") return;
      const next = gameReducer(state, { type: "throw", point });
      if (next === state) return;
      if (mode === "family") {
        if (family.phase !== "playing") return;
        dispatchFamily({ type: "land", point });
      } else dispatch({ type: "throw", point });
      if (mode === "mission") {
        const previous = rewardRef.current;
        const awarded = awardMissionStar(previous, roundRef.current, evaluateMission(missionId, next.shots.map((shot) => shot.score)));
        if (awarded !== previous) {
          rewardRef.current = awarded;
          setStarRecord({ stars: awarded.stars, available: saveMissionStars(awarded.stars) });
        }
      }
      if (next.shots.length === MAX_SHOTS && (mode !== "family" || family.active === 1)) setScreen("result");
      // 한 판을 끝낸 점수만 저장하고 중간에 다시 시작한 판은 제외합니다.
      if (next.shots.length === MAX_SHOTS && next.totalScore > bestRecord.score) {
        const saved = saveBestScore(next.totalScore);
        setBestRecord({ score: next.totalScore, available: saved });
        setIsNewRecord(true);
        setRecordMessage(saved ? "최고 기록을 저장했어요." : "기록은 이 화면에서만 유지돼요.");
      }
    },
  });
  const isFlying = aim.phase === "flying";
  const settingsAllowed = screen === "home";
  const familyPaused = mode === "family" && family.phase !== "playing";
  const aimInstruction = mode === "family" && family.phase === "setup" ? "이름과 속도를 정하고 대결 시작을 눌러요."
    : mode === "family" && family.phase === "handoff" ? "다음 플레이어 버튼으로 차례를 넘겨요."
    : mode === "family" && family.phase === "finished" ? familyResult(family)
    : isFinished ? "세 발 완료! 다시 하기로 새 판을 시작해요."
    : isFlying ? "다트가 날아가고 있어요!"
    : aim.phase === "swirl" ? "회오리 조준점을 보고 한 번 눌러 던져요!"
    : aim.phase === "horizontal" ? "① 좌우로 움직이는 조준점을 멈춰요."
    : "② 위아래로 움직이는 조준점을 멈추고 던져요.";

  function restartGame() {
    setConfirmReset(false);
    roundRef.current += 1;
    setIsNewRecord(false);
    setRecordMessage("");
    resetAim();
    soundRef.current?.stop();
    dispatch({ type: "reset" });
    if (mode === "family") dispatchFamily({ type: "restart" });
  }

  function changeMode(next: GameMode) {
    if (!settingsAllowed || confirmReset || next === mode) return;
    restartGame();
    if (next === "family") dispatchFamily({ type: "restart" });
    setMode(next);
  }

  function startGame() {
    if (confirmReset) return;
    restartGame();
    if (mode === "luck") setLuckScore(drawLuckScore());
    if (mode === "family") {
      changeDifficulty(family.players[0].difficulty);
      dispatchFamily({ type: "start" });
    }
    setScreen("playing");
  }

  function goHome() {
    restartGame();
    dispatchFamily({ type: "restart" });
    setScreen("home");
  }

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);

  function nextPlayer() {
    if (family.phase !== "handoff" || confirmReset) return;
    soundRef.current?.stop();
    setIsNewRecord(false);
    setRecordMessage("");
    resetAim();
    changeDifficulty(family.players[1].difficulty);
    dispatchFamily({ type: "next" });
  }

  function changeMission(next: MissionId) {
    if (!settingsAllowed || confirmReset) return;
    restartGame();
    setMissionId(next);
  }

  function clearBestRecord() {
    const removed = deleteBestScore();
    setBestRecord({ score: 0, available: removed });
    setIsNewRecord(false);
    setRecordMessage(removed ? "최고 기록을 삭제했어요. 현재 판의 점수는 유지돼요." : "이 화면의 기록을 초기화했어요. 브라우저에 저장된 기록은 삭제하지 못했어요.");
  }

  function changeCosmetics(value: Cosmetics) {
    if (!settingsAllowed || confirmReset) return;
    const cosmetics = restoreCosmetics(value, starRecord.stars);
    const available = saveCosmetics(cosmetics, starRecord.stars);
    setCosmeticRecord({ cosmetics, available });
    setTreasureMessage(available ? "" : "선택한 꾸미기는 이 화면에서만 유지돼요.");
  }

  function resetTreasures() {
    if (!settingsAllowed || !confirmReset) return;
    restartGame();
    setScreen("home");
    rewardRef.current = { stars: 0, rewardedRound: null };
    const starsSaved = saveMissionStars(0);
    const cosmeticsSaved = saveCosmetics(DEFAULT_COSMETICS, 0);
    setStarRecord({ stars: 0, available: starsSaved });
    setCosmeticRecord({ cosmetics: { ...DEFAULT_COSMETICS }, available: cosmeticsSaved });
    setTreasureMessage(starsSaved && cosmeticsSaved ? "별과 보물을 초기화했어요. 최고 기록은 유지돼요." : "화면의 별과 보물을 초기화했지만 저장하지 못한 항목은 새로고침 후 다시 나타날 수 있어요.");
  }

  function toggleSound() {
    soundRef.current?.stop();
    setSoundEnabled((enabled) => !enabled);
  }

  const modeNames: Record<GameMode, string> = { basic: "기본 도전", mission: "미션 도전", family: "가족 대결", luck: "행운의 점수" };
  const modeDescriptions: Record<GameMode, string> = {
    basic: "세 발로 180점에 도전해요.", mission: "미션을 성공하고 별을 모아요.",
    family: "두 사람이 세 발씩, 함께 겨뤄요.", luck: "빛나는 행운 영역을 맞혀요.",
  };
  const shotHistory = (
    <ol className="shot-history" aria-label="발별 점수">
      {Array.from({ length: MAX_SHOTS }, (_, index) => (
        <li key={index} className={state.shots[index] ? "shot-record shot-record-thrown" : "shot-record"}>
          <span>{index + 1}번째 다트</span>
          <strong>{state.shots[index] ? `${state.shots[index].score}점` : "대기"}</strong>
        </li>
      ))}
    </ol>
  );
  const soundButton = <button type="button" className="sound-toggle" aria-pressed={soundEnabled} onClick={toggleSound}>효과음 {soundEnabled ? "켜짐" : "꺼짐"}</button>;
  const bestRecordPanel = (
    <>
      <div className="best-record">
        <div><span aria-hidden="true">★</span> 최고 기록 <strong>{bestRecord.score}점</strong></div>
        <button type="button" onClick={clearBestRecord} disabled={bestRecord.score === 0}>최고 기록 삭제</button>
      </div>
      {!bestRecord.available && <p className="storage-notice">기록은 이 화면에서만 유지돼요. 새로고침하면 사라질 수 있어요.</p>}
      <p className="record-message" aria-live="polite">{recordMessage}</p>
    </>
  );

  return (
    <main className={`workshop screen-${screen} theme-${cosmeticRecord.cosmetics.theme}`}>
      <header className="page-header">
        <h1 aria-label="호호가족의 다트 게임">{screen === "home" ? <>호호가족의<br /><span>다트 게임</span></> : <span>호호가족의 다트 게임</span>}</h1>
        {screen === "home" && <p className="introduction">오늘은 어떤 도전을 해볼까요?</p>}
      </header>
      <ol className="screen-steps" aria-label="게임 진행 단계">
        {(["home", "playing", "result"] as const).map((step, index) => <li key={step} aria-current={screen === step ? "step" : undefined}><span>{index + 1}</span>{["모드 선택", "게임", "결과"][index]}</li>)}
      </ol>
      <section className="board-card" aria-labelledby="screen-heading">
        <div className="card-header">
          <h2 id="screen-heading" ref={headingRef} tabIndex={-1}>{screen === "home" ? "게임을 골라 주세요" : screen === "result" ? "이번 도전의 결과" : modeNames[mode]}</h2>
          <span className="phase-badge">{screen === "home" ? "START" : screen === "result" ? "FINISH" : "PLAY"}</span>
        </div>

        {screen === "home" && <>
          <div className="mode-picker home-modes" role="group" aria-label="게임 모드">
            {(Object.keys(modeNames) as GameMode[]).map((item) => <button key={item} type="button" aria-pressed={mode === item} disabled={confirmReset} onClick={() => changeMode(item)}><strong>{modeNames[item]}</strong><span>{modeDescriptions[item]}</span></button>)}
          </div>
          {mode === "mission" && <section className="mission-card">
            <label>미션 선택<select value={missionId} disabled={confirmReset} onChange={(event) => changeMission(event.target.value as MissionId)}>{MISSIONS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <p>{mission.description}</p>
          </section>}
          {mode === "luck" && <p className="mode-description">게임을 시작하면 이번 판의 행운 점수를 뽑아요. 점수와 별에 보너스는 없어요.</p>}
          <ChoiceCards<AimPattern> label="조준 방식" value={aimPattern} disabled={confirmReset} onChange={setAimPattern} options={[
            { value: "axes", label: AIM_PATTERN_LABELS.axes, description: "가로와 세로를 정해 두 번 눌러요." },
            { value: "swirl", label: AIM_PATTERN_LABELS.swirl, description: "움직이는 조준점을 보고 한 번 눌러요." },
          ]} />
          {mode === "family" ? <FamilyPanel state={family} disabled={confirmReset} onConfigure={dispatchFamily} onNext={nextPlayer} /> : <DifficultyCards value={difficulty} disabled={confirmReset} onChange={changeDifficulty} />}
          <button type="button" className="primary-action start-button" disabled={confirmReset} onClick={startGame}>게임 시작</button>
          <details className="home-extras">
            <summary>보물 상자 · 모은 별 ★ {starRecord.stars}개</summary>
            <TreasurePanel stars={starRecord.stars} cosmetics={cosmeticRecord.cosmetics} enabled={settingsAllowed} confirming={confirmReset} onChange={changeCosmetics} onConfirming={setConfirmReset} onReset={resetTreasures} />
          </details>
          {!starRecord.available && <p className="storage-notice">별은 이 화면에서만 유지돼요. 새로고침하면 사라질 수 있어요.</p>}
          {!cosmeticRecord.available && <p className="storage-notice">꾸미기를 저장할 수 없어요. 새로고침 후 기본 테마가 나올 수 있어요.</p>}
          <p className="record-message" role="status">{treasureMessage}</p>
          {bestRecordPanel}
          <div className="screen-actions">{soundButton}</div>
        </>}

        {screen === "playing" && <>
          {mode === "mission" && <section className="mission-card"><h3>{mission.name}</h3><p>{progress.text}</p><p className="mission-hint">{progress.conditionMet ? "조건 달성! 세 발을 마치면 별을 받아요." : mission.description}</p></section>}
          {mode === "luck" && <section className="luck-panel"><h3 id="luck-heading">오늘의 행운: {luckScore}점</h3><p role="status">{luckHit ? "✦ 행운 명중! 이번 판 배지를 받았어요." : "빛나는 영역을 맞혀 보세요!"}</p>{luckHit && <div className="luck-sparkles" aria-hidden="true">✦ ★ ✧ ★ ✦</div>}</section>}
          {mode === "family" && <FamilyPanel state={family} onConfigure={dispatchFamily} onNext={nextPlayer} />}
          {mode === "family" && family.phase === "handoff" ? <div className="handoff-summary"><h3>첫 번째 도전 완료!</h3><p>{playerName(family.players[0], 0)} · {state.totalScore}점</p><p>위의 ‘다음 플레이어’ 버튼을 눌러 차례를 넘겨 주세요.</p>{shotHistory}</div> : <>
            <div className="score-panel" aria-label="게임 점수">
              <div><span>마지막 점수</span><strong>{lastShot ? `${lastShot.score}점` : "—"}</strong></div>
              <div><span>누적 점수</span><strong>{state.totalScore}점</strong></div>
              <div><span>남은 다트</span><strong>{remainingShots}발</strong></div>
            </div>
            <DartBoard shots={state.shots} aim={aim} theme={cosmeticRecord.cosmetics.theme} decoration={cosmeticRecord.cosmetics.decoration} luckScore={mode === "luck" ? luckScore : undefined} />
            <div className="aim-controls">
              <p aria-live="polite">{aimInstruction}</p>
              <button className="aim-button" type="button" disabled={isFlying || isFinished || familyPaused} onClick={act}>{isFlying ? "날아가는 중…" : aim.phase === "swirl" ? "지금 위치에 던지기" : aim.phase === "horizontal" ? "가로 위치 정하기" : "세로 위치 정하고 던지기"}</button>
              <span className="keyboard-hint">버튼을 클릭·터치하거나 Space 키를 누르세요.</span>
              <span className="keyboard-hint">{mode === "family" ? `${playerName(family.players[family.active], family.active)} · ` : ""}{DIFFICULTY_LABELS[difficulty]}</span>
            </div>
            <p className="board-caption" aria-live="polite">{lastShot ? `${state.shots.length}번째 다트: ${lastShot.score}점! 누적 ${state.totalScore}점.` : aimPattern === "swirl" ? "원하는 순간에 한 번 눌러 첫 다트를 던져 보세요." : "조준점을 두 번 멈춰 첫 다트를 던져 보세요."}</p>
            {shotHistory}
            <details className="score-rules"><summary>점수 규칙 보기</summary><ul className="score-guide">{SCORE_ZONES.map((zone) => <li key={zone.score}><strong>{zone.score}점</strong></li>)}<li>테두리·판 밖 <strong>0점</strong></li></ul></details>
          </>}
          <div className="screen-actions">{soundButton}<button type="button" onClick={startGame}>다시 하기</button><button type="button" onClick={goHome}>홈으로</button></div>
        </>}

        {screen === "result" && <>
          <p className="mode-description">{AIM_PATTERN_LABELS[aimPattern]}</p>
          <section className="result-card" aria-labelledby="result-heading">
            <Celebration kind={state.totalScore === MAX_TOTAL_SCORE ? "perfect" : isNewRecord ? "record" : state.totalScore >= TARGET_SCORE || (mode === "mission" && progress.success) || luckHit ? "target" : "encourage"} />
            <h3 id="result-heading">{mode === "family" ? familyResult(family) : `${modeNames[mode]} 완료!`}</h3>
            {mode === "family" ? <div className="family-players">{family.players.map((player, index) => <div className="family-player" key={index}><h3>{playerName(player, index)}</h3><p className="result-score">{player.game.totalScore}<span> / {MAX_TOTAL_SCORE}점</span></p><p>{player.game.shots.map((shot) => `${shot.id}발: ${shot.score}점`).join(" / ")}</p><p>{DIFFICULTY_LABELS[player.difficulty]}</p></div>)}</div> : <>
              <p className="result-score">{state.totalScore}<span> / {MAX_TOTAL_SCORE}점</span></p>
              <p>{getResultMessage(state.totalScore)}</p>
              <p className="result-detail">목표 {TARGET_SCORE}점 · {state.totalScore >= TARGET_SCORE ? "목표 달성!" : "다음 도전도 응원해요!"}</p>
              {shotHistory}
            </>}
            {mode === "mission" && <p className="mission-result">{mission.name} · {progress.success ? `미션 성공! ★ +1 · 모은 별 ${starRecord.stars}개` : "미션 실패 · 별은 그대로예요."}</p>}
            {mode === "luck" && <p className="mission-result">행운 {luckScore}점 · {luckHit ? "✦ 행운 명중 배지" : "행운 배지 없음"}</p>}
          </section>
          <ResultImageSave data={{
            modeName: modeNames[mode],
            aimLabel: AIM_PATTERN_LABELS[aimPattern],
            theme: cosmeticRecord.cosmetics.theme,
            headline: mode === "family" ? familyResult(family) : getResultMessage(state.totalScore),
            players: mode === "family" ? family.players.map((player, index) => ({
              name: playerName(player, index), difficulty: DIFFICULTY_LABELS[player.difficulty],
              totalScore: player.game.totalScore, scores: player.game.shots.map((shot) => shot.score),
            })) : [{ name: "나의 도전", difficulty: DIFFICULTY_LABELS[difficulty], totalScore: state.totalScore, scores: state.shots.map((shot) => shot.score) }],
            achievement: mode === "mission" ? `${mission.name} · ${progress.success ? "미션 성공!" : "다음 미션에 도전해요!"}`
              : mode === "luck" ? `행운 ${luckScore}점 · ${luckHit ? "행운 명중 배지!" : "다음 행운에 도전해요!"}`
              : mode === "family" ? "서로의 도전을 응원해요!" : state.totalScore >= TARGET_SCORE ? "목표 달성! 멋진 도전!" : "세 발의 도전 완료!",
            detail: mode === "mission" ? progress.success ? "이번 판 별 +1 · 별은 점수와 별개예요." : "이번 판 별 +0 · 다음 도전도 응원해요."
              : mode === "luck" ? "배지는 이번 판만 · 점수와 별 보너스는 없어요." : mode === "family" ? "개인별 세 발 점수 · 미션 별은 지급하지 않아요." : `목표 ${TARGET_SCORE}점 · 다음 도전도 함께 해요!`,
            stars: starRecord.stars,
            bestScore: bestRecord.score,
          }} />
          <div className="screen-actions result-actions"><button type="button" className="primary-action" onClick={startGame}>다시 하기</button><button type="button" onClick={goHome}>홈으로</button></div>
          <p className="replay-hint">다시 하기는 같은 모드와 설정으로 시작해요.</p>
          {bestRecordPanel}
          <p>모은 별 <strong>★ {starRecord.stars}개</strong></p>
          {!starRecord.available && <p className="storage-notice">별은 이 화면에서만 유지돼요. 새로고침하면 사라질 수 있어요.</p>}
          <div className="screen-actions">{soundButton}</div>
        </>}
      </section>
      <footer>호호가족의 다트 게임 · 최고 기록은 같은 브라우저와 접속 주소에서 유지돼요.</footer>
    </main>
  );
}
