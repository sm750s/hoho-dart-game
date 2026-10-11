type CelebrationProps = { kind: "perfect" | "record" | "target" | "encourage" };

export default function Celebration({ kind }: CelebrationProps) {
  const messages = {
    perfect: "완벽한 세 발! 다트 챔피언!",
    record: "새로운 최고 기록!",
    target: "목표 달성! 멋진 도전!",
    encourage: "도전 완료! 다음 판도 함께 해요!",
  };
  return (
    <div className={`celebration celebration-${kind}`}>
      {kind !== "encourage" && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: kind === "perfect" ? 24 : 14 }, (_, index) => (
            <span key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 5) * 0.08}s` }} />
          ))}
        </div>
      )}
      <p className="celebration-message"><span aria-hidden="true">{kind === "encourage" ? "✦" : "★"}</span> {messages[kind]}</p>
    </div>
  );
}
