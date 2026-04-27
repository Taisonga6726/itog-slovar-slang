type SoundConfig = {
  src: string;
  volume?: number;
};

type PlayOptions = {
  waitForEnd?: boolean;
  stopBefore?: boolean;
};

export class SoundManager {
  private readonly sounds: Record<string, HTMLAudioElement> = {};

  constructor(config: Record<string, SoundConfig>) {
    const normalizeVolume = (name: string, rawVolume?: number): number => {
      const base = typeof rawVolume === "number" ? rawVolume : 1;
      const isBackground = /(bg|background|hymn|music|loop|ambient)/i.test(name);
      if (isBackground) {
        // Фон всегда тише эффектов: целевой диапазон 0.2–0.3.
        return 0.25;
      }
      // Игровые эффекты делаем отчетливыми: целевой диапазон 0.8–1.0.
      return Math.max(0.8, Math.min(1, base));
    };

    Object.entries(config).forEach(([name, cfg]) => {
      const audio = new Audio(cfg.src);
      audio.preload = "auto";
      audio.volume = normalizeVolume(name, cfg.volume);
      this.sounds[name] = audio;
    });
  }

  play(name: string, options: PlayOptions = {}): Promise<void> {
    const audio = this.sounds[name];
    if (!audio) return Promise.resolve();

    const { waitForEnd = false, stopBefore = true } = options;
    if (stopBefore) this.stopAll();

    audio.currentTime = 0;
    const started = audio.play().catch(() => {});
    if (!waitForEnd) return started.then(() => {});

    return new Promise((resolve) => {
      const done = () => resolve();
      audio.addEventListener("ended", done, { once: true });
      audio.addEventListener("error", done, { once: true });
      void started;
    });
  }

  getDuration(name: string): number | null {
    const audio = this.sounds[name];
    if (!audio) return null;
    const duration = audio.duration;
    if (!Number.isFinite(duration) || duration <= 0) return null;
    return duration;
  }

  stopAll() {
    Object.values(this.sounds).forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        /* ignore */
      }
    });
  }
}
