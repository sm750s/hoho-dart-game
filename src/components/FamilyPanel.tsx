import { DIFFICULTY_LABELS, familyResult, playerName } from "../family";
import type { FamilyAction, FamilyState } from "../family";
import { DifficultyCards } from "./ChoiceCards";

type FamilyPanelProps = {
  state: FamilyState;
  onConfigure: (action: FamilyAction) => void;
  onNext: () => void;
  disabled?: boolean;
};

export default function FamilyPanel({ state, onConfigure, onNext, disabled = false }: FamilyPanelProps) {
  return (
    <section className="family-panel" aria-labelledby="family-heading">
      <h2 id="family-heading">가족 대결 · 한 사람씩 세 발</h2>
      <div className="family-players">
        {state.players.map((player, index) => (
          <div className={`family-player${state.phase === "playing" && state.active === index ? " family-player-active" : ""}`} key={index}>
            {state.phase === "setup" ? (
              <>
                <label>플레이어 {index + 1} 이름
                  <input disabled={disabled} value={player.name} maxLength={20} placeholder={`플레이어 ${index + 1}`} onChange={(event) => onConfigure({ type: "configure", index: index as 0 | 1, name: event.target.value })} />
                </label>
                <DifficultyCards disabled={disabled} label={`플레이어 ${index + 1} 난이도`} value={player.difficulty} onChange={(difficulty) => onConfigure({ type: "configure", index: index as 0 | 1, difficulty })} />
              </>
            ) : <h3>{playerName(player, index)} <small>· {DIFFICULTY_LABELS[player.difficulty]}</small></h3>}
            <p><strong>{player.game.totalScore}점</strong> · 남은 다트 {3 - player.game.shots.length}발</p>
            <p className="family-shot-list">{player.game.shots.length ? player.game.shots.map((shot) => `${shot.id}발: ${shot.score}점`).join(" / ") : "아직 던지지 않았어요."}</p>
          </div>
        ))}
      </div>
      <p aria-live="polite">{state.phase === "setup" ? "이름과 속도를 정한 뒤 게임 시작을 누르세요. 미션 별은 지급하지 않아요."
        : state.phase === "playing" ? `${playerName(state.players[state.active], state.active)} 차례예요!`
        : state.phase === "handoff" ? `${playerName(state.players[0], 0)}의 세 발이 끝났어요. 기기를 다음 사람에게 넘겨주세요.`
        : familyResult(state)}</p>
      {state.phase === "handoff" && <button type="button" onClick={onNext}>다음 플레이어</button>}
    </section>
  );
}
