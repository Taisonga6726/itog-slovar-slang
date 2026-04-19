import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Play, Pause, X } from "lucide-react";
import { HYMN_TRACKS, type HymnTrack } from "@/data/hymnTracks";
import NeonGlassButton from "@/components/NeonGlassButton";
import { cn } from "@/lib/utils";

/** Фон панели выбора гимна (public/images) */
export const VIBE_PANEL_BG_SRC = "/images/fon-dlya-gimn.png";

/** Портрет / постер (public/images/vaib.jpg) */
export const VIBE_HOST_PHOTO_SRC = "/images/vaib.jpg";

/** @deprecated см. VIBE_HOST_PHOTO_SRC */
export const VIBE_POSTER_SRC = "/images/vaib-01.jpg";

type TrackId = string;

const TRACKS: HymnTrack[] = HYMN_TRACKS;
/** Как в сетке 2×6: левая колонка — чётные индексы, правая — нечётные */
const TRACKS_LEFT = HYMN_TRACKS.filter((_, i) => i % 2 === 0);
const TRACKS_RIGHT = HYMN_TRACKS.filter((_, i) => i % 2 === 1);

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
 * Экран аудиоверсий: фон на весь экран; сверху два баннера (всего / популярная);
 * на lg — треки слева и справа, постер по центру; на мобиле — постер и сетка всех треков.
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

  const grandTotals = useMemo(() => {
    const acc = emptyReactions();
    let sum = 0;
    for (const tr of TRACKS) {
      const r = reactions[tr.id];
      for (const { key } of REACTIONS) {
        const v = r[key] ?? 0;
        acc[key] += v;
        sum += v;
      }
    }
    return { acc, sum };
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

  const renderTrackCard = (t: HymnTrack) => {
    const r = reactions[t.id];
    const isPlaying = playingId === t.id;
    return (
      <div
        key={t.id}
        className={cn(
          "rounded-2xl border bg-black/45 p-2.5 shadow-[0_0_16px_rgba(168,85,247,0.12)] backdrop-blur-md sm:p-3",
          isPlaying
            ? "border-fuchsia-400/65 shadow-[0_0_22px_rgba(236,72,153,0.25)]"
            : "border-fuchsia-500/30",
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <p className="min-w-0 flex-1 text-left text-[11px] font-semibold leading-snug text-white drop-shadow-[0_0_8px_rgba(34,211,238,0.35)] sm:text-xs md:text-[13px]">
            {t.title}
          </p>
          <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
            <button
              type="button"
              onClick={() => togglePlay(t)}
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-white shadow-md transition-transform hover:scale-105 active:scale-95",
                isPlaying
                  ? "border-cyan-300/70 bg-gradient-to-br from-fuchsia-600 to-violet-700"
                  : "border-cyan-300/45 bg-gradient-to-br from-violet-600/95 to-fuchsia-700/90",
              )}
              aria-label={isPlaying ? "Пауза" : "Играть"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
            </button>
            <a
              href={t.src}
              download={t.fileName}
              className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-cyan-50/95 shadow-[0_0_10px_rgba(56,189,248,0.15)] hover:border-fuchsia-300/50 hover:bg-black/50 sm:text-[11px]"
            >
              <Download className="h-3.5 w-3.5 shrink-0 opacity-90" />
              скачать
            </a>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 border-t border-fuchsia-400/25 pt-2.5">
          {REACTIONS.map(({ key, emoji }) => (
            <button
              key={key}
              type="button"
              onClick={() => bumpReaction(t.id, key)}
              className="flex min-h-[34px] min-w-[2.1rem] flex-col items-center justify-center rounded-xl border border-white/15 bg-black/50 px-1.5 py-0.5 text-[10px] leading-none text-white/95 transition hover:border-fuchsia-400/55 hover:shadow-[0_0_12px_rgba(192,38,211,0.25)] sm:min-w-[2.35rem] sm:text-xs"
              title="+1 к реакции"
            >
              <span className="text-[15px] leading-none">{emoji}</span>
              <span className="mt-0.5 tabular-nums text-[9px] font-bold opacity-95">{r[key]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (!open) return null;

  const node = (
    <div
      className="fixed inset-0 z-[200] flex flex-col overflow-hidden text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Выбор гимна — 12 аудиоверсий"
    >
      <span className="sr-only">
        Подпись автора на фоне экрана. Аудио: слова и вокал — Таня Гайдук.
      </span>
      <audio ref={audioRef} preload="metadata" className="hidden" />

      <img
        src={VIBE_PANEL_BG_SRC}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-fuchsia-950/20 to-black/60"
        aria-hidden
      />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-[310] flex h-10 w-10 items-center justify-center rounded-full border-2 border-sky-400/50 bg-black/55 text-white shadow-[0_0_18px_rgba(56,189,248,0.25)] backdrop-blur-md transition hover:border-fuchsia-300/60 hover:bg-black/75 sm:right-4 sm:top-4"
        style={{ marginTop: "max(0px, env(safe-area-inset-top, 0px))" }}
        aria-label="Закрыть"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-[205] flex min-h-0 flex-1 flex-col px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-3">
        <header className="mb-2 shrink-0 text-center">
          <h2 className="text-base font-bold tracking-wide text-white drop-shadow-[0_0_12px_rgba(168,85,247,0.5)] sm:text-lg">
            Выбери свой гимн
          </h2>
          <p className="mt-0.5 text-[11px] text-cyan-100/85 sm:text-xs">12 аудиоверсий · реакции и скачивание</p>
        </header>

        {/* Итоговое расположение: слева «всего», справа «популярная» (как на макете) */}
        <div className="mb-2 grid shrink-0 grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-3">
          <div
            className="rounded-2xl border border-white/20 px-3 py-2.5 text-center shadow-[0_0_22px_rgba(168,85,247,0.35)] sm:px-4 sm:py-3"
            style={{
              background: "linear-gradient(135deg, rgba(91,33,182,0.75), rgba(124,58,237,0.65) 50%, rgba(168,85,247,0.55))",
              textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}
          >
            <div className="text-xs font-bold tracking-tight text-white sm:text-sm">Всего реакций</div>
            <p className="mt-1 text-lg font-bold tabular-nums text-white sm:text-xl">всего {grandTotals.sum}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-white/25 pt-2 text-[10px] text-white/95 sm:text-[11px]">
              {REACTIONS.map(({ key, emoji }) => (
                <span key={key} className="tabular-nums">
                  {emoji} {grandTotals.acc[key]}
                </span>
              ))}
            </div>
          </div>
          <div
            className="rounded-2xl border border-white/20 px-3 py-2.5 text-center shadow-[0_0_22px_rgba(168,85,247,0.35)] sm:px-4 sm:py-3"
            style={{
              background: "linear-gradient(135deg, #c026d3, #7c3aed 45%, #a855f7)",
              textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}
          >
            <div className="text-xs font-bold tracking-tight text-white sm:text-sm">🏆 Самая популярная версия</div>
            <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug text-white/95 sm:text-sm">{popularTrack.title}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-white/25 pt-2 text-[10px] text-white/95 sm:text-[11px]">
              <span className="tabular-nums font-semibold">всего {popularScore}</span>
              {REACTIONS.map(({ key, emoji }) => (
                <span key={key} className="tabular-nums">
                  {emoji} {popularR[key]}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mx-auto mb-2 w-full max-w-[280px] shrink-0 overflow-hidden rounded-2xl border border-fuchsia-400/35 shadow-[0_0_28px_rgba(192,38,211,0.22),inset_0_0_24px_rgba(56,189,248,0.06)] lg:hidden">
          <img
            src={VIBE_HOST_PHOTO_SRC}
            alt="Вайб-кодер — обложка версий гимна"
            className="max-h-[min(32vh,300px)] w-full object-cover object-top"
            draggable={false}
          />
        </div>

        {/* Мобилка: сетка всех треков */}
        <div className="flex min-h-0 flex-1 flex-col lg:hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch]">
            <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:gap-2.5">
              {TRACKS.map((t) => renderTrackCard(t))}
            </div>
          </div>
        </div>

        {/* Десктоп: треки слева и справа, постер по центру */}
        <div className="hidden min-h-0 flex-1 gap-3 pb-1 lg:grid lg:min-h-[200px] lg:grid-cols-[1fr_minmax(200px,280px)_1fr] lg:items-start">
          <div className="min-h-0 max-h-[min(78vh,820px)] overflow-y-auto overscroll-contain pr-0.5">
            <div className="flex flex-col gap-2">{TRACKS_LEFT.map((t) => renderTrackCard(t))}</div>
          </div>
          <div className="sticky top-0 mx-auto w-full max-h-[min(78vh,820px)] overflow-hidden rounded-2xl border border-fuchsia-400/35 shadow-[0_0_28px_rgba(192,38,211,0.22)]">
            <img
              src={VIBE_HOST_PHOTO_SRC}
              alt=""
              className="h-full w-full object-contain object-center"
              draggable={false}
            />
          </div>
          <div className="min-h-0 max-h-[min(78vh,820px)] overflow-y-auto overscroll-contain pl-0.5">
            <div className="flex flex-col gap-2">{TRACKS_RIGHT.map((t) => renderTrackCard(t))}</div>
          </div>
        </div>

        {(onBackToBook || onPlayGame || onEnterWord) && (
          <div className="mt-2 flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-fuchsia-400/20 bg-black/25 py-3 backdrop-blur-sm">
            {onBackToBook && (
              <NeonGlassButton
                className="pointer-events-auto !px-3 !py-2 !text-center !text-[11px] sm:!text-sm"
                onClick={onBackToBook}
              >
                назад к книге
              </NeonGlassButton>
            )}
            {onPlayGame && (
              <NeonGlassButton
                className="pointer-events-auto !px-3 !py-2 !text-center !text-[11px] sm:!text-sm"
                onClick={onPlayGame}
              >
                Крутим игру?
              </NeonGlassButton>
            )}
            {onEnterWord && (
              <NeonGlassButton
                accent
                className="pointer-events-auto !px-3 !py-2 !text-center !text-[11px] sm:!text-sm"
                onClick={onEnterWord}
              >
                ввести слово
              </NeonGlassButton>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
