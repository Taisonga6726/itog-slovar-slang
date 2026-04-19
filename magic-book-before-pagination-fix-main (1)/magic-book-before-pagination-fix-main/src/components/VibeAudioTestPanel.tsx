import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Play, Pause, X } from "lucide-react";
import { HYMN_TRACKS, type HymnTrack } from "@/data/hymnTracks";
import NeonGlassButton from "@/components/NeonGlassButton";
import VibeAiLogoMark from "@/components/VibeAiLogoMark";
import { cn } from "@/lib/utils";

/** Совместимость: путь к PNG — единый с VibeAiLogoMark. */
export { VIBE_AI_LOGO_SRC } from "@/components/VibeAiLogoMark";

/** Фон панели выбора гимна (public/images) */
export const VIBE_PANEL_BG_SRC = "/images/fon-dlya-gimn.png";

/** Портрет / постер (public/images/vaib.jpg) */
export const VIBE_HOST_PHOTO_SRC = "/images/vaib.jpg";

/** @deprecated см. VIBE_HOST_PHOTO_SRC */
export const VIBE_POSTER_SRC = "/images/vaib-01.jpg";

type TrackId = string;

const TRACKS: HymnTrack[] = HYMN_TRACKS;
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
  onBackToBook?: () => void;
  /** Как на макете: «играть в игру» */
  onPlayGame?: () => void;
  onEnterWord?: () => void;
}

/**
 * Макет панели гимна — по референсу автора: лого сверху (VibeAiLogoMark),
 * две верхние плашки, три колонки (дорожки | постер | дорожки),
 * строка трека: название слева — белый play — кнопка «сохр.», реакции снизу на всю ширину.
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
        title={t.title}
        className={cn(
          "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-black/55 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.2)] backdrop-blur-sm",
          isPlaying ? "border-cyan-300/50" : "border-white/12",
        )}
      >
        <div className="flex min-h-0 w-full items-center gap-1.5 px-1.5 py-1 sm:gap-2 sm:px-2 sm:py-1.5">
          <p className="line-clamp-2 min-w-0 flex-1 text-left font-serif text-[10px] font-medium leading-snug tracking-tight text-white/95 sm:text-[11px]">
            {t.title}
          </p>
          <button
            type="button"
            onClick={() => togglePlay(t)}
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-md transition hover:brightness-95 active:scale-95 sm:h-9 sm:w-9",
              isPlaying && "ring-2 ring-fuchsia-400/80",
            )}
            aria-label={isPlaying ? "Пауза" : "Играть"}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />}
          </button>
          <a
            href={t.src}
            download={t.fileName}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-white/20 bg-zinc-950/90 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-white/95 shadow-sm hover:border-fuchsia-300/40 sm:text-[9px]"
          >
            <Download className="h-2.5 w-2.5 shrink-0 opacity-90" />
            сохр.
          </a>
        </div>
        <div className="flex w-full flex-nowrap items-stretch justify-between gap-px border-t border-white/[0.08] bg-black/30 px-0.5 py-0.5 sm:gap-0.5 sm:px-1 sm:py-1">
          {REACTIONS.map(({ key, emoji }) => (
            <button
              key={key}
              type="button"
              onClick={() => bumpReaction(t.id, key)}
              className="flex min-w-0 flex-1 flex-col items-center justify-center rounded border border-white/[0.06] bg-black/35 py-0.5 leading-none text-white/95 transition hover:border-fuchsia-400/35"
              title="+1"
            >
              <span className="text-[8px] sm:text-[9px]">{emoji}</span>
              <span className="tabular-nums text-[6px] font-medium opacity-90 sm:text-[7px]">{r[key]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const statCardBase =
    "flex min-h-[4.25rem] flex-col justify-center rounded-xl border border-white/15 px-2 py-1.5 text-center shadow-[0_0_14px_rgba(168,85,247,0.25)] sm:min-h-[4.5rem] sm:px-2.5 sm:py-2";

  const headerBlock = (
    <>
      <VibeAiLogoMark className="mb-1 shrink-0 sm:mb-1.5" />
      <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:gap-2">
        <div
          className={cn(statCardBase)}
          style={{
            background: "linear-gradient(135deg, rgba(91,33,182,0.82), rgba(124,58,237,0.68))",
          }}
        >
          <div className="text-[8px] font-bold text-white sm:text-[9px]">Всего реакций</div>
          <p className="mt-0.5 text-xs font-bold tabular-nums text-white sm:text-sm">всего {grandTotals.sum}</p>
          <div className="mt-1 flex flex-nowrap justify-center gap-1 border-t border-white/15 pt-1 text-[7px] text-white/95 sm:text-[8px]">
            {REACTIONS.map(({ key, emoji }) => (
              <span key={key} className="tabular-nums">
                {emoji}
                {grandTotals.acc[key]}
              </span>
            ))}
          </div>
        </div>
        <div
          className={cn(statCardBase)}
          style={{
            background: "linear-gradient(135deg, #c026d3, #7c3aed 45%, #a855f7)",
          }}
        >
          <div className="text-[8px] font-bold leading-tight text-white sm:text-[9px]">🏆 Самая популярная версия</div>
          <p className="mt-0.5 line-clamp-2 text-[8px] font-semibold leading-tight text-white/95 sm:text-[9px]">{popularTrack.title}</p>
          <div className="mt-1 flex flex-nowrap justify-center gap-1 border-t border-white/20 pt-1 text-[7px] text-white/95 sm:text-[8px]">
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
    </>
  );

  if (!open) return null;

  const node = (
    <div
      className="fixed inset-0 z-[200] flex flex-col overflow-y-auto overflow-x-hidden text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Выбор гимна — 12 аудиоверсий"
    >
      <span className="sr-only">
        Подпись автора на фоне экрана. Аудио: слова и вокал — Таня Гайдук.
      </span>
      <audio ref={audioRef} preload="metadata" className="hidden" />

      {/* Затемнение вокруг — контент на «баннере», не на весь экран (как object-contain у картинок проекта) */}
      <div className="pointer-events-none fixed inset-0 bg-black/72" aria-hidden />

      <button
        type="button"
        onClick={onClose}
        className="fixed right-3 top-3 z-[310] flex h-10 w-10 items-center justify-center rounded-full border-2 border-sky-400/50 bg-black/55 text-white shadow-[0_0_18px_rgba(56,189,248,0.25)] backdrop-blur-md transition hover:border-fuchsia-300/60 hover:bg-black/75 sm:right-4 sm:top-4"
        style={{ marginTop: "max(0px, env(safe-area-inset-top, 0px))" }}
        aria-label="Закрыть"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-[205] mx-auto flex min-h-min w-full max-w-[min(1100px,96vw)] flex-1 flex-col justify-center px-3 py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-12 sm:px-5 sm:py-6 sm:pt-14 md:max-h-[min(92dvh,900px)] md:py-8">
        <div className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-fuchsia-500/25 bg-black/35 shadow-[0_8px_48px_rgba(0,0,0,0.55)] backdrop-blur-sm">
          <img
            src={VIBE_PANEL_BG_SRC}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl object-cover object-center"
            draggable={false}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-black/45 via-fuchsia-950/15 to-black/55"
            aria-hidden
          />

          <div className="relative flex min-h-0 max-h-[min(88dvh,860px)] flex-col overflow-hidden px-2 pb-2 pt-2 sm:px-3 sm:pb-3 sm:pt-3">
            <div className="mb-1 flex shrink-0 flex-col gap-1 lg:mb-1.5 lg:gap-1.5">{headerBlock}</div>

            {/* Мобилка: сетка 2×6 без центрального постера */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
              <div className="grid min-h-0 min-w-0 flex-1 grid-cols-2 grid-rows-6 gap-1 overflow-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TRACKS.map((t) => renderTrackCard(t))}
              </div>
            </div>

            {/* Десктоп: колонки + постер уменьшен, чтобы влезла подпись внизу (как картинка целиком в кадре) */}
            <div className="hidden min-h-0 min-w-0 flex-1 gap-2 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(200px,min(28vw,340px))_minmax(0,1fr)] lg:items-start lg:gap-2 lg:pb-0 xl:gap-3">
              <div className="grid min-h-0 min-w-0 grid-rows-6 gap-1 overflow-hidden pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TRACKS_LEFT.map((t) => renderTrackCard(t))}
              </div>
              <div className="flex min-h-0 w-full flex-col items-center justify-start">
                <div className="flex w-full max-w-[280px] flex-col items-center justify-end overflow-hidden rounded-xl border border-fuchsia-400/40 bg-black/30 p-1 shadow-[0_0_20px_rgba(192,38,211,0.18)] sm:max-w-[min(30vw,320px)]">
                  <img
                    src={VIBE_HOST_PHOTO_SRC}
                    alt=""
                    className="h-auto max-h-[min(32vh,280px)] w-full object-contain object-bottom sm:max-h-[min(36vh,320px)]"
                    draggable={false}
                  />
                </div>
              </div>
              <div className="grid min-h-0 min-w-0 grid-rows-6 gap-1 overflow-hidden pl-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TRACKS_RIGHT.map((t) => renderTrackCard(t))}
              </div>
            </div>

            {(onBackToBook || onPlayGame || onEnterWord) && (
              <div className="mt-2 flex shrink-0 flex-col gap-2 rounded-xl border border-fuchsia-400/10 bg-black/30 py-2.5 backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-center gap-2 px-1 sm:gap-3">
                  {onBackToBook && (
                    <NeonGlassButton
                      className="pointer-events-auto !min-h-[2.5rem] !px-4 !py-2 !text-center !text-[11px] sm:!min-h-[2.75rem] sm:!text-sm"
                      onClick={onBackToBook}
                    >
                      назад к книге
                    </NeonGlassButton>
                  )}
                  {onPlayGame && (
                    <NeonGlassButton
                      className="pointer-events-auto !min-h-[2.5rem] !px-4 !py-2 !text-center !text-[11px] sm:!min-h-[2.75rem] sm:!text-sm"
                      onClick={onPlayGame}
                    >
                      играть в игру
                    </NeonGlassButton>
                  )}
                  {onEnterWord && (
                    <NeonGlassButton
                      className="pointer-events-auto !min-h-[2.5rem] !px-4 !py-2 !text-center !text-[11px] sm:!min-h-[2.75rem] sm:!text-sm"
                      onClick={onEnterWord}
                    >
                      ввести слово
                    </NeonGlassButton>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
