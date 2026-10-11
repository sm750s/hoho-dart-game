import assert from "node:assert/strict";
import test from "node:test";
import { SoundEffects } from "../src/sound.ts";

function fakeAudio() {
  const starts: number[] = [];
  const stops: number[] = [];
  const pitches: { start: number; end: number }[] = [];
  let closed = false;
  const param = {
    setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
  };
  const context = {
    state: "running",
    currentTime: 10,
    destination: {},
    resume: async () => {},
    close: async () => { closed = true; },
    createOscillator: () => {
      const pitch = { start: 0, end: 0 };
      pitches.push(pitch);
      return {
        type: "sine", frequency: {
          setValueAtTime(value: number) { pitch.start = value; },
          exponentialRampToValueAtTime(value: number) { pitch.end = value; },
        }, onended: null,
        connect() {}, disconnect() {},
        start(time: number) { starts.push(time); },
        stop(time?: number) { stops.push(time ?? 0); },
      };
    },
    createGain: () => ({ gain: param, connect() {}, disconnect() {} }),
  };
  const sound = new SoundEffects(() => context as unknown as AudioContext);
  return { sound, context, starts, stops, pitches, isClosed: () => closed };
}

test("0~50점은 하강음, 60~100점은 상승음이며 높은 점수일수록 높아진다", async () => {
  const endPitches = new Map<number, number>();
  for (const score of [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
    const audio = fakeAudio();
    await audio.sound.playThrow(score, false);
    const pitch = audio.pitches[0];
    assert.ok(score >= 60 ? pitch.end > pitch.start : pitch.end < pitch.start);
    endPitches.set(score, pitch.end);
    audio.sound.dispose();
  }
  for (const score of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
    assert.ok(endPitches.get(score)! > endPitches.get(score - 10)!);
  }
});

test("마지막 투척은 일반 투척음 뒤에 완료음을 예약한다", async () => {
  const regular = fakeAudio();
  await regular.sound.playThrow(30, false);
  const final = fakeAudio();
  await final.sound.playThrow(30, true);
  assert.ok(regular.starts.length > 0);
  assert.ok(final.starts.length > regular.starts.length);
  assert.ok(Math.min(...final.starts.slice(regular.starts.length)) > Math.max(...regular.starts));
  final.sound.stop();
  assert.equal(final.stops.filter((time) => time === 0).length, final.starts.length);
  regular.sound.dispose();
  final.sound.dispose();
  assert.equal(final.isClosed(), true);
});

test("다시 하기나 음소거 중 오디오 활성화가 늦게 끝나도 이전 소리를 재생하지 않는다", async () => {
  const audio = fakeAudio();
  audio.context.state = "suspended";
  let resolveResume = () => {};
  audio.context.resume = () => new Promise<void>((resolve) => { resolveResume = resolve; });
  const pending = audio.sound.playThrow(30, true);
  audio.sound.stop();
  audio.context.state = "running";
  resolveResume();
  await pending;
  assert.equal(audio.starts.length, 0);
  await audio.sound.playThrow(30, false);
  assert.ok(audio.starts.length > 0);
  audio.sound.dispose();
});

test("오디오 생성 실패와 재생 차단을 처리한다", async () => {
  const unsupported = new SoundEffects(() => { throw new Error("unsupported"); });
  await assert.doesNotReject(unsupported.playThrow(30, true));
  unsupported.dispose();
  const blocked = fakeAudio();
  blocked.context.state = "suspended";
  blocked.context.resume = async () => { throw new Error("blocked"); };
  await assert.doesNotReject(blocked.sound.playThrow(30, true));
  assert.equal(blocked.starts.length, 0);
  blocked.sound.dispose();
});
