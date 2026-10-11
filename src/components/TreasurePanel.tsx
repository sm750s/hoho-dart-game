import { TREASURES } from "../treasures";
import type { Cosmetics } from "../treasures";
type Props = {
  stars: number; cosmetics: Cosmetics; enabled: boolean; confirming: boolean;
  onChange: (value: Cosmetics) => void; onConfirming: (value: boolean) => void; onReset: () => void;
};
export default function TreasurePanel({ stars, cosmetics, enabled, confirming, onChange, onConfirming, onReset }: Props) {
  return <section className="treasure-panel" aria-labelledby="treasure-heading">
    <h2 id="treasure-heading">우리의 보물 상자</h2>
    <p>★ {stars}개 · 별은 쓰지 않고 모아요. 시작 전이나 종료 후 꾸밀 수 있어요.</p>
    <div className="treasure-options">
      {TREASURES.map((item) => {
        const unlocked = stars >= item.stars;
        const selected = item.id === "star" ? cosmetics.decoration === "star" : cosmetics.theme === item.id;
        return <button key={item.id} type="button" disabled={!enabled || !unlocked || confirming} aria-pressed={selected}
          onClick={() => onChange(item.id === "star" ? { ...cosmetics, decoration: selected ? "plain" : "star" } : { ...cosmetics, theme: item.id })}>
          {item.name}<span>{unlocked ? selected ? "선택됨" : "해제됨" : `별 ${item.stars}개 필요 (앞으로 ${item.stars - stars}개)`}</span>
        </button>;
      })}
    </div>
    <p>별빛 다트를 다시 누르면 기본 다트로 돌아가요.</p>
    <button type="button" disabled={!enabled || confirming} onClick={() => onConfirming(true)}>별·보물 초기화</button>
    {confirming && <div className="reset-confirmation" role="group" aria-label="별과 보물 초기화 확인">
      <p>모은 별과 꾸미기를 초기화할까요? 최고 기록은 유지돼요.</p>
      <button type="button" onClick={onReset}>초기화하기</button>
      <button type="button" onClick={() => onConfirming(false)}>취소</button>
    </div>}
  </section>;
}
