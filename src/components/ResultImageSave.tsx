import { useEffect, useRef, useState } from "react";
import { createResultImage } from "../resultImage";
import type { ResultImageData } from "../resultImage";

export default function ResultImageSave({ data }: { data: ResultImageData }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const urlRef = useRef<string | null>(null);
  const requestRef = useRef(0);
  const busyRef = useRef(false);
  const filename = "호호가족-다트게임-결과.png";

  useEffect(() => () => {
    requestRef.current += 1;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  async function saveImage() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage("");
    const request = ++requestRef.current;
    try {
      const blob = await createResultImage(data);
      if (request !== requestRef.current) return;
      const url = URL.createObjectURL(blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setImageUrl(url);
      // 다운로드를 지원하지 않는 모바일도 아래 이미지에서 길게 눌러 저장할 수 있습니다.
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setMessage("결과 이미지를 만들었어요. 저장한 이미지를 친구에게 보내세요!");
    } catch {
      if (request === requestRef.current) setMessage("이미지를 만들지 못했어요. 다시 눌러 주세요.");
    } finally {
      if (request === requestRef.current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  return <section className="result-image-save" aria-label="결과 이미지 저장">
    <button type="button" className="primary-action" disabled={busy} onClick={() => void saveImage()}>{busy ? "이미지 만드는 중…" : "결과 이미지 저장"}</button>
    <p role="status">{message}</p>
    {imageUrl && <>
      <p>자동으로 저장되지 않았다면 <a href={imageUrl} download={filename}>PNG 이미지 저장</a>을 누르세요. 휴대폰에서는 아래 이미지를 길게 눌러 저장할 수도 있어요.</p>
      <img className="result-image-preview" src={imageUrl} alt={`${data.modeName} 결과 카드. ${data.headline}. ${data.players.map((player) => `${player.name} ${player.totalScore}점`).join(", ")}. ${data.achievement}`} />
    </>}
  </section>;
}
