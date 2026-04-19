import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Play, Pause, X } from "lucide-react";
import { HYMN_TRACKS, type HymnTrack } from "@/data/hymnTracks";
import NeonGlassButton from "@/components/NeonGlassButton";

/** Фон панели выбора гимна (public/images) */
export const VIBE_PANEL_BG_SRC = "/images/fon-dlya-gimn.png";

/** Портрет / постер (public/images/vaib.jpg) */
export const VIBE_HOST_PHOTO_SRC = "/images/vaib.jpg";

/** @deprecated см. VIBE_HOST_PHOTO_SRC */
export const VIBE_POSTER_SRC = "/images/vaib-01.jpg";

type TrackId = string;

const TRACKS: HymnTrack[] = HYMN_TRACKS;

type ReactionKey = "fire" | "love" | "rocket" | "clap" | "headphone";

const REACTIONS: { key: ReactionKey; emoji: string }[] = [
  { key: "fire", emoji: "🔥" },
  { key: "love", emoji: "❤️" },
  { key: "rocket", emoji: "🚀" },
  { key: "clap", emoji: "👏" },
  { key: "headphone", emoji: "🎧" },
];

function emptyReactions(): Record<ReactionKey, number> {
  return { fire: 0, love: 0, rocket: 0, clap: 0, headphone: 0 };
}

function sumReactions(r: Record<ReactionKey, number>): number {
  return REACTIONS.reduce((acc, { key }) => acc + (r[key] ?? 0), 0);
}

interface VibeAudioTestPanelProps {
  open: boolean;
  onClose: () => void;
  /** Нижняя панель: к книге (закрыть + переход) */
  onBackToBook?: () => void;
  onPlayGame?: () => void;
  onEnterWord?: () => void;
}

/**
 * Экран аудиоверсий: фон на весь экран; фото слева поверх; 12 треков с реальными файлами.
 */
export default function VibeAudioTestPanel({
  open,
  onClose,
  onBackToBook,
  onPlayGame,
  onEnterWord,
}: VibeAudioTestPanelProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<TrackId | null>(null);
  const [reactions, setReactions] = useState<Record<TrackId, Record<ReactionKey, number>>>(() =>
    Object.fromEntries(TRACKS.map((t) => [t.id, emptyReactions()])) as Record<TrackId, Record<ReactionKey, number>>,
  );

  const { popularTrack, popularR, popularScore } = useMemo(() => {
    let bestId = TRACKS[0].id;
    let bestScore = -1;
    for (const tr of TRACKS) {
      const r = reactions[tr.id];
      const s = sumReactions(r);
      if (s > bestScore) {
        bestScore = s;
        bestId = tr.id;
      }
    }
    const popularTrack = TRACKS.find((x) => x.id === bestId) ?? TRACKS[0];
    const popularR = reactions[bestId] ?? emptyReactions();
    const popularScore = sumReactions(popularR);
    return { popularTrack, popularR, popularScore };
  }, [reactions]);

  const togglePlay = useCallback(
    (track: HymnTrack) => {
      const el = audioRef.current;
      if (!el) return;
      if (playingId === track.id) {
        el.pause();
        setPlayingId(null);
        return;
      }
      el.src = track.src;
      el.play().catch(() => {});
      setPlayingId(track.id);
    },
    [playingId],
  );

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => setPlayingId(null);
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, []);

  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
  }, [open]);

  const bumpReaction = (trackId: TrackId, key: ReactionKey) => {
    setReactions((prev) => ({
      ...prev,
      [trackId]: { ...prev[trackId], [key]: (prev[trackId]?.[key] ?? 0) + 1 },
    }));
  };

  if (!open) return null;

  const node = (
    <div
      className="fixed inset-0 z-[200] flex flex-col overflow-hidden text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Выбор гимна"
    >
      <audio ref={audioRef} preload="metadata" className="hidden" />

      <img
        src={VIBE_PANEL_BG_SRC}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/55"
        aria-hidden
      />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-[310] flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white shadow-lg backdrop-blur-md hover:bg-black/70 sm:right-4 sm:top-4"
        style={{ marginTop: "max(0px, env(safe-area-inset-top, 0px))" }}
        aria-label="Закрыть"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-[205] flex min-h-0 flex-1 flex-col pt-[max(0.5rem,env(safe-area-inset-top))] md:flex-row">
        {/* Постер поверх баннера, без отдельного «чёрного блока» */}
        <div className="relative flex max-h-[36vh] w-full shrink-0 items-center justify-center px-2 md:max-h-none md:h-full md:w-[min(42%,300px)] md:min-w-[180px] md:max-w-[38vw]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35 md:bg-gradient-to-r md:from-transparent md:via-black/15 md:to-black/40" />
          <img
            src={VIBE_HOST_PHOTO_SRC}
            alt=""
            className="relative z-[1] max-h-[min(36vh,420px)] w-full max-w-full object-contain object-center md:max-h-[85vh]"
            draggable={false}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col px-2 pb-1 pt-2 md:px-3 md:pb-2 md:pt-3">
          <div className="mb-2 shrink-0 rounded-xl border border-amber-400/55 bg-black/55 px-2 py-2.5 text-center shadow-[0_0_18px_rgba(168,85,247,0.12)] backdrop-blur-sm sm:px-3">
            <div className="text-xs font-semibold tracking-tight text-amber-100/95 sm:text-sm">
              🏆 Самая популярная версия
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] text-white/88 sm:text-xs">
              <span className="max-w-[95%] font-medium leading-snug text-cyan-100/95">{popularTrack.title}</span>
              <span className="text-white/35">·</span>
              <span>всего {popularScore}</span>
              {REACTIONS.map(({ key, emoji }) => (
                <React.Fragment key={key}>
                  <span className="text-white/35">·</span>
                  <span>
                    {emoji} {popularR[key]}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden md:overflow-hidden md:pr-0.5">
            <div className="mx-auto max-h-full max-w-4xl pb-1">
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {TRACKS.map((t) => {
                  const r = reactions[t.id];
                  const isPlaying = playingId === t.id;
                  return (
                    <div
                      key={t.id}
                      className="rounded-xl border border-cyan-400/45 bg-black/50 p-2 shadow-[0_0_14px_rgba(34,211,238,0.08)] backdrop-blur-sm sm:p-2.5"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <p className="min-w-0 flex-1 text-left text-[10px] font-semibold leading-snug text-cyan-100/95 sm:text-[11px] md:text-xs">
                          {t.title}
                        </p>
                        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:justify-start">
                          <button
                            type="button"
                            onClick={() => togglePlay(t)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-md transition-transform hover:scale-105 active:scale-95"
                            aria-label={isPlaying ? "Пауза" : "Играть"}
                          >
                            {isPlaying ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
                            )}
                          </button>
                          <a
                            href={t.src}
                            download={t.fileName}
                            className="inline-flex items-center gap-0.5 rounded-full border border-white/30 bg-white/5 px-2 py-1 text-[9px] font-medium text-white/95 hover:bg-white/12 sm:text-[10px]"
                          >
                            <Download className="h-3 w-3 shrink-0" />
                            скачать
                          </a>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap justify-center gap-1 border-t border-cyan-400/20 pt-2">
                        {REACTIONS.map(({ key, emoji }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => bumpReaction(t.id, key)}
                            className="flex min-h-[32px] min-w-[2rem] flex-col items-center justify-center rounded-lg border border-white/12 bg-black/40 px-1 py-0.5 text-[10px] leading-none text-white/95 hover:border-cyan-400/45 sm:min-w-[2.25rem] sm:text-xs"
                            title="+1"
                          >
                            <span>{emoji}</span>
                            <span className="mt-0.5 tabular-nums text-[9px] font-semibold opacity-90">{r[key]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {(onBackToBook || onPlayGame || onEnterWord) && (
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-white/10 pt-3">
              {onBackToBook && (
                <NeonGlassButton
                  type="button"
                  className="pointer-events-auto !px-3 !py-2 !text-center !text-[11px] sm:!text-sm"
                  onClick={onBackToBook}
                >
                  назад к книге
                </NeonGlassButton>
              )}
              {onPlayGame && (
                <NeonGlassButton
                  type="button"
                  className="pointer-events-auto !px-3 !py-2 !text-center !text-[11px] sm:!text-sm"
                  onClick={onPlayGame}
                >
                  играть в игру
                </NeonGlassButton>
              )}
              {onEnterWord && (
                <NeonGlassButton
                  type="button"
                  accent
                  className="pointer-events-auto !px-3 !py-2 !text-center !text-[11px] sm:!text-sm"
                  onClick={onEnterWord}
                >
                  внести слово
                </NeonGlassButton>
              )}
            </div>
          )}

          <p className="shrink-0 self-end pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-2 text-right text-[10px] text-amber-200/90 sm:text-xs">
            Автор слов и вокал — Таня Гайдук
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
