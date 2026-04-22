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
    Object.entries(config).forEach(([name, cfg]) => {
      const audio = new Audio(cfg.src);
      audio.preload = "auto";
      audio.volume = cfg.volume ?? 1;
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
