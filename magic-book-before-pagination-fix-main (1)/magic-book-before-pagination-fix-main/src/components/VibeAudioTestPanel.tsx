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

/** Логотип AI — тот же PNG, что на первом экране / GlobalVibeShell */
export const VIBE_AI_LOGO_SRC = "/images/LOGO.png.png";

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
  /** Как на финале: «Крутим удачу?» */
  onLuck?: () => void;
  onEnterWord?: () => void;
}

/**
 * Макет: логотип отдельной строкой (без наложения баннеров); треки — строка 1: название + play + скачать; строка 2: реакции.
 */
export default function VibeAudioTestPanel({
  open,
  onClose,
  onBackToBook,
  onLuck,
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
        title={t.title}
        className={cn(
          "flex h-full min-h-0 flex-col justify-center gap-0.5 overflow-hidden rounded-md border bg-black/45 px-1 py-0.5 shadow-[0_0_8px_rgba(168,85,247,0.07)] backdrop-blur-md sm:rounded-lg sm:px-1.5 sm:py-1",
          isPlaying
            ? "border-fuchsia-400/65 shadow-[0_0_12px_rgba(236,72,153,0.18)]"
            : "border-fuchsia-500/25",
        )}
      >
        <div className="flex min-h-0 w-full items-center gap-1">
          <p className="line-clamp-2 min-w-0 flex-1 text-left text-[7px] font-semibold leading-tight text-white/95 drop-shadow-[0_0_3px_rgba(34,211,238,0.2)] sm:text-[8px]">
            {t.title}
          </p>
          <button
            type="button"
            onClick={() => togglePlay(t)}
            className={cn(
              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-white shadow-sm transition-transform hover:scale-105 active:scale-95 sm:h-7 sm:w-7",
              isPlaying
                ? "border-cyan-300/70 bg-gradient-to-br from-fuchsia-600 to-violet-700"
                : "border-cyan-300/45 bg-gradient-to-br from-violet-600/95 to-fuchsia-700/90",
            )}
            aria-label={isPlaying ? "Пауза" : "Играть"}
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="ml-0.5 h-3 w-3" fill="currentColor" />}
          </button>
          <a
            href={t.src}
            download={t.fileName}
            className="inline-flex shrink-0 items-center justify-center gap-0.5 rounded border border-sky-400/35 bg-black/35 px-1 py-0.5 text-[6px] font-semibold leading-none text-cyan-50/95 hover:border-fuchsia-300/50 sm:text-[7px]"
          >
            <Download className="h-2 w-2 shrink-0 opacity-90" />
            <span className="hidden min-[400px]:inline">скачать</span>
          </a>
        </div>
        <div className="flex w-full flex-nowrap items-center justify-between gap-px border-t border-white/[0.06] pt-0.5 sm:gap-0.5">
          {REACTIONS.map(({ key, emoji }) => (
            <button
              key={key}
              type="button"
              onClick={() => bumpReaction(t.id, key)}
              className="flex min-w-0 flex-1 flex-col items-center justify-center rounded border border-white/[0.07] bg-black/40 py-0.5 leading-none text-white/95 transition hover:border-fuchsia-400/35"
              title="+1"
            >
              <span className="text-[7px] sm:text-[8px]">{emoji}</span>
              <span className="tabular-nums text-[5px] font-medium opacity-90 sm:text-[6px]">{r[key]}</span>
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

      <div className="relative z-[205] flex min-h-0 flex-1 flex-col overflow-hidden px-1.5 pb-[max(0.2rem,env(safe-area-inset-bottom))] pt-[max(0.25rem,env(safe-area-inset-top))] sm:px-2">
        {/* Мобилка: логотип отдельно → два баннера (без наложения на лого) */}
        <div className="mb-0.5 flex shrink-0 flex-col gap-1 lg:hidden">
          <div className="pointer-events-none flex justify-center px-1 pt-0.5">
            <img
              src={VIBE_AI_LOGO_SRC}
              alt=""
              width={320}
              height={140}
              className="h-[min(6.5vh,48px)] w-auto max-w-[min(200px,55vw)] object-contain [filter:drop-shadow(0_0_10px_rgba(120,220,255,0.4))_drop-shadow(0_0_18px_rgba(160,100,255,0.28))]"
              draggable={false}
            />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div
              className="rounded-xl border border-white/15 px-1.5 py-1 text-center shadow-[0_0_14px_rgba(168,85,247,0.25)]"
              style={{
                background: "linear-gradient(135deg, rgba(91,33,182,0.8), rgba(124,58,237,0.65))",
              }}
            >
              <div className="text-[8px] font-bold leading-tight text-white">Всего реакций</div>
              <p className="mt-0.5 text-xs font-bold tabular-nums leading-none text-white">всего {grandTotals.sum}</p>
              <div className="mt-1 flex flex-nowrap justify-center gap-0.5 border-t border-white/15 pt-1 text-[7px] text-white/95">
                {REACTIONS.map(({ key, emoji }) => (
                  <span key={key} className="tabular-nums">
                    {emoji}
                    {grandTotals.acc[key]}
                  </span>
                ))}
              </div>
            </div>
            <div
              className="rounded-xl border border-white/15 px-1.5 py-1 text-center shadow-[0_0_14px_rgba(168,85,247,0.3)]"
              style={{
                background: "linear-gradient(135deg, #c026d3, #7c3aed 45%, #a855f7)",
              }}
            >
              <div className="text-[8px] font-bold leading-tight text-white">🏆 Самая популярная версия</div>
              <p className="mt-0.5 line-clamp-2 text-[8px] font-semibold leading-tight text-white/95">{popularTrack.title}</p>
              <div className="mt-1 flex flex-nowrap justify-center gap-0.5 border-t border-white/20 pt-1 text-[7px] text-white/95">
                <span className="tabular-nums font-semibold">{popularScore}</span>
                {REACTIONS.map(({ key, emoji }) => (
                  <span key={key} className="tabular-nums">
                    {emoji}
                    {popularR[key]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Десктоп: логотип отдельной строкой; под ним — два баннера (нет пересечения с лого) */}
        <div className="mb-1 hidden shrink-0 flex-col gap-1.5 lg:flex">
          <div className="pointer-events-none flex justify-center py-0.5">
            <img
              src={VIBE_AI_LOGO_SRC}
              alt=""
              width={320}
              height={140}
              className="h-[min(8vh,64px)] w-auto max-w-[min(200px,28vw)] object-contain [filter:drop-shadow(0_0_10px_rgba(120,220,255,0.45))_drop-shadow(0_0_20px_rgba(160,100,255,0.3))]"
              draggable={false}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div
              className="rounded-xl border border-white/15 px-2 py-1 text-center shadow-[0_0_16px_rgba(168,85,247,0.28)]"
              style={{
                background: "linear-gradient(135deg, rgba(91,33,182,0.82), rgba(124,58,237,0.68))",
              }}
            >
              <div className="text-[9px] font-bold text-white">Всего реакций</div>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-white">всего {grandTotals.sum}</p>
              <div className="mt-1 flex flex-wrap justify-center gap-x-1 gap-y-0 border-t border-white/18 pt-1 text-[8px] text-white/95">
                {REACTIONS.map(({ key, emoji }) => (
                  <span key={key} className="tabular-nums">
                    {emoji} {grandTotals.acc[key]}
                  </span>
                ))}
              </div>
            </div>
            <div
              className="rounded-xl border border-white/15 px-2 py-1 text-center shadow-[0_0_16px_rgba(168,85,247,0.32)]"
              style={{
                background: "linear-gradient(135deg, #c026d3, #7c3aed 45%, #a855f7)",
              }}
            >
              <div className="text-[9px] font-bold text-white">🏆 Самая популярная версия</div>
              <p className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-snug text-white/95">{popularTrack.title}</p>
              <div className="mt-1 flex flex-wrap justify-center gap-x-1 gap-y-0 border-t border-white/22 pt-1 text-[8px] text-white/95">
                <span className="tabular-nums font-semibold">{popularScore}</span>
                {REACTIONS.map(({ key, emoji }) => (
                  <span key={key} className="tabular-nums">
                    {emoji} {popularR[key]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Мобилка: 2×6, всё в экране — без прокрутки (постер только на lg по центру) */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
          <div className="grid min-h-0 min-w-0 flex-1 grid-cols-2 grid-rows-6 gap-0.5 overflow-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TRACKS.map((t) => renderTrackCard(t))}
          </div>
        </div>

        {/* Десктоп: по 6 строк в колонке, без скролла */}
        <div className="hidden min-h-0 min-w-0 flex-1 gap-1.5 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(112px,min(22vw,240px))_minmax(0,1fr)] lg:items-stretch lg:pb-0 xl:grid-cols-[minmax(0,1fr)_minmax(128px,min(20vw,260px))_minmax(0,1fr)]">
          <div className="grid min-h-0 min-w-0 grid-rows-6 gap-0.5 overflow-hidden pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TRACKS_LEFT.map((t) => renderTrackCard(t))}
          </div>
          <div className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-xl border border-fuchsia-400/35 shadow-[0_0_20px_rgba(192,38,211,0.2)]">
            <img
              src={VIBE_HOST_PHOTO_SRC}
              alt=""
              className="h-full max-h-full w-full object-contain object-center"
              draggable={false}
            />
          </div>
          <div className="grid min-h-0 min-w-0 grid-rows-6 gap-0.5 overflow-hidden pl-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TRACKS_RIGHT.map((t) => renderTrackCard(t))}
          </div>
        </div>

        {(onBackToBook || onLuck || onEnterWord) && (
          <div className="mt-1 flex shrink-0 flex-wrap items-center justify-center gap-1.5 border-t border-fuchsia-400/15 bg-black/20 py-2 backdrop-blur-sm">
            {onBackToBook && (
              <NeonGlassButton
                className="pointer-events-auto !px-3 !py-2 !text-center !text-[11px] sm:!text-sm"
                onClick={onBackToBook}
              >
                назад к книге
              </NeonGlassButton>
            )}
            {onLuck && (
              <NeonGlassButton
                accent
                className="pointer-events-auto !block w-full max-w-[min(90vw,22rem)] text-center !px-6 !py-3 !text-base sm:!text-lg"
                onClick={onLuck}
              >
                Крутим удачу?
              </NeonGlassButton>
            )}
            {onEnterWord && (
              <NeonGlassButton
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
