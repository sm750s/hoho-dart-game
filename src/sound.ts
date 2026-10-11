type Tone = {
  frequency: number;
  endFrequency?: number;
  delay: number;
  duration: number;
  volume: number;
  type: OscillatorType;
};

function getThrowTones(score: number): Tone[] {
  const isHighScore = score >= 60;
  return [{
    frequency: 330,
    endFrequency: isHighScore ? 330 + score * 5.5 : 130 + score * 3,
    delay: 0,
    duration: 0.20,
    volume: 0.14,
    type: "triangle",
  }];
}

// 짧은 한 음 뒤에 밝은 화음을 겹쳐 “따단!”을 표현합니다.
const COMPLETE_TONES: Tone[] = [
  { frequency: 523.25, delay: 0.26, duration: 0.16, volume: 0.10, type: "triangle" },
  ...[523.25, 659.25, 783.99].map((frequency): Tone => ({
    frequency, delay: 0.46, duration: 0.55, volume: 0.07, type: "triangle",
  })),
];

export class SoundEffects {
  private context: AudioContext | null = null;
  private activeTones = new Set<OscillatorNode>();
  private generation = 0;
  private readonly createContext: () => AudioContext;

  constructor(createContext: () => AudioContext = () => new AudioContext()) {
    this.createContext = createContext;
  }

  async playThrow(score: number, isLastShot: boolean, completionDelay = 0): Promise<void> {
    const generation = this.generation;
    try {
      // 첫 투척 클릭 안에서 생성해 브라우저의 자동 재생 제한을 따릅니다.
      this.context ??= this.createContext();
      const context = this.context;
      if (context.state !== "running") await context.resume();
      if (generation !== this.generation || context.state !== "running") return;

      const startTime = context.currentTime + 0.01;
      const throwTones = getThrowTones(score);
      const tones = isLastShot
        ? [...throwTones, ...COMPLETE_TONES.map((tone) => ({ ...tone, delay: tone.delay + completionDelay }))]
        : throwTones;
      for (const tone of tones) this.scheduleTone(context, tone, startTime);
    } catch {
      // 오디오가 지원되지 않거나 차단되어도 게임은 계속됩니다.
    }
  }

  stop(): void {
    this.generation += 1;
    for (const oscillator of this.activeTones) {
      oscillator.stop();
      oscillator.disconnect();
    }
    this.activeTones.clear();
  }

  dispose(): void {
    this.stop();
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
  }

  private scheduleTone(context: AudioContext, tone: Tone, startTime: number): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = startTime + tone.delay;
    const end = start + tone.duration;

    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.frequency, start);
    if (tone.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(tone.endFrequency, end);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(tone.volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    this.activeTones.add(oscillator);
    oscillator.onended = () => {
      this.activeTones.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }
}
