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
      <div key={t.id} className="flex min-h-0 flex-col gap-0.5" title={t.title}>
        <div
          className={cn(
            "flex min-h-0 w-full items-center gap-1.5 overflow-visible rounded-lg border bg-black/55 px-1.5 py-0.5 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.2)] backdrop-blur-sm sm:gap-2 sm:px-2 sm:py-1",
            isPlaying ? "border-cyan-300/50" : "border-white/12",
          )}
        >
          <p className="line-clamp-2 min-w-0 flex-1 text-left font-serif text-[11px] font-medium leading-snug tracking-tight text-white/95 sm:text-[12px]">
            {t.title}
          </p>
          <button
            type="button"
            onClick={() => togglePlay(t)}
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-md transition hover:brightness-95 active:scale-95 sm:h-8 sm:w-8",
              isPlaying && "ring-2 ring-fuchsia-400/80",
            )}
            aria-label={isPlaying ? "Пауза" : "Играть"}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />}
          </button>
          <a
            href={t.src}
            download={t.fileName}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-white/20 bg-zinc-950/90 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white/95 shadow-sm hover:border-fuchsia-300/40 sm:text-[9px]"
          >
            <Download className="h-2.5 w-2.5 shrink-0 opacity-90" />
            сохр.
          </a>
        </div>

        {/* Реакции отдельным блоком под дорожкой (не объединяем в одну карточку с треком) */}
        <div className="flex w-full justify-end pr-1 lg:pr-2">
          <div className="inline-flex translate-x-1 flex-nowrap items-center gap-1 rounded-lg border border-white/[0.14] bg-black/45 px-1.5 py-0.5 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.16)] sm:gap-1.5 sm:px-2">
          {REACTIONS.map(({ key, emoji }) => (
            <button
              key={key}
              type="button"
              onClick={() => bumpReaction(t.id, key)}
              className="inline-flex min-w-[2.35rem] items-center justify-center gap-0.5 rounded-full border border-white/[0.2] bg-black/55 px-1.5 py-0.5 leading-none text-white/95 transition hover:border-fuchsia-400/45"
              title="+1"
            >
              <span className="text-[14px] sm:text-[15px]">{emoji}</span>
              <span className="tabular-nums text-[11px] font-semibold opacity-95 sm:text-[12px]">{r[key]}</span>
            </button>
          ))}
          </div>
        </div>
      </div>
    );
  };

  const statCardBase =
    "flex h-[4.3rem] w-[17.5rem] shrink-0 flex-col justify-center rounded-full border border-white/20 px-6 py-3 text-center shadow-[0_0_14px_rgba(168,85,247,0.25)] sm:h-[4.6rem] sm:w-[18.5rem] sm:px-7 sm:py-3.5";
  const statReactionRowClass =
    "mt-1 inline-flex h-[2.1rem] w-[17.5rem] shrink-0 translate-x-1 flex-nowrap items-center justify-center gap-1 rounded-full border border-white/[0.2] bg-black/40 px-3 py-1.5 text-[12px] text-white/95 sm:h-[2.25rem] sm:w-[18.5rem] sm:text-[13px]";

  const headerBlock = (
    <>
      <VibeAiLogoMark className="mb-0.5 shrink-0 sm:mb-1" />
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-1 sm:gap-3 sm:px-4 lg:hidden">
        <div
          className={cn(statCardBase)}
          style={{
            background: "linear-gradient(135deg, rgba(91,33,182,0.82), rgba(124,58,237,0.68))",
          }}
        >
          <div className="text-[12px] font-bold text-white sm:text-[13px]">Всего и эмоции</div>
          <p className="mt-0.5 text-base font-bold tabular-nums text-white sm:text-lg">всего {grandTotals.sum}</p>
        </div>
        <div className={statReactionRowClass}>
          {REACTIONS.map(({ key, emoji }) => (
            <span key={key} className="tabular-nums font-semibold">
              {emoji} {grandTotals.acc[key]}
            </span>
          ))}
        </div>
        <div
          className={cn(statCardBase)}
          style={{
            background: "linear-gradient(135deg, #c026d3, #7c3aed 45%, #a855f7)",
          }}
        >
          <div className="text-[10px] font-bold leading-tight text-white sm:text-[11px]">🏆 Самый популярный трек</div>
          <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-tight text-white/95 sm:text-[11px]">{popularTrack.title}</p>
        </div>
        <div className={statReactionRowClass}>
          <span className="tabular-nums font-semibold">{popularScore}</span>
          {REACTIONS.map(({ key, emoji }) => (
            <span key={key} className="tabular-nums font-semibold">
              {emoji} {popularR[key]}
            </span>
          ))}
        </div>
      </div>

      {/* Desktop: статистика строго над левыми/правыми дорожками */}
      <div className="hidden shrink-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,min(44vw,540px))_minmax(0,1fr)] lg:items-start lg:gap-2 lg:-translate-y-2 xl:gap-3">
        <div className="flex flex-col items-center pl-1">
          <div
            className={cn(statCardBase)}
            style={{
              background: "linear-gradient(135deg, rgba(91,33,182,0.82), rgba(124,58,237,0.68))",
            }}
          >
            <div className="text-[10px] font-bold text-white sm:text-[11px]">Всего и эмоции</div>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-white sm:text-base">всего {grandTotals.sum}</p>
          </div>
          <div className={statReactionRowClass}>
            {REACTIONS.map(({ key, emoji }) => (
              <span key={key} className="tabular-nums font-semibold">
                {emoji} {grandTotals.acc[key]}
              </span>
            ))}
          </div>
        </div>

        <div />

        <div className="flex flex-col items-center pr-1">
          <div
            className={cn(statCardBase)}
            style={{
              background: "linear-gradient(135deg, #c026d3, #7c3aed 45%, #a855f7)",
            }}
          >
            <div className="text-[12px] font-bold leading-tight text-white sm:text-[13px]">🏆 Самый популярный трек</div>
            <p className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-tight text-white/95 sm:text-[13px]">{popularTrack.title}</p>
          </div>
          <div className={statReactionRowClass}>
            <span className="tabular-nums font-semibold">{popularScore}</span>
            {REACTIONS.map(({ key, emoji }) => (
              <span key={key} className="tabular-nums font-semibold">
                {emoji} {popularR[key]}
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

      {/* Фон: ваш баннер в PNG уже внизу картинки — показываем файл целиком, прижатый к низу экрана (без object-cover «поверх» и без второго слоя-градиента на сам баннер) */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-end justify-center bg-black">
        <img
          src={VIBE_PANEL_BG_SRC}
          alt=""
          className="h-auto max-h-[100dvh] w-full max-w-[min(1600px,100vw)] select-none object-contain object-bottom"
          draggable={false}
        />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="fixed right-3 top-3 z-[310] flex h-10 w-10 items-center justify-center rounded-full border-2 border-sky-400/50 bg-black/55 text-white shadow-[0_0_18px_rgba(56,189,248,0.25)] backdrop-blur-md transition hover:border-fuchsia-300/60 hover:bg-black/75 sm:right-4 sm:top-4"
        style={{ marginTop: "max(0px, env(safe-area-inset-top, 0px))" }}
        aria-label="Закрыть"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative z-[205] mx-auto flex min-h-[100dvh] w-full max-w-[min(1240px,95vw)] flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.3rem,env(safe-area-inset-top))] sm:px-5 sm:pb-3 sm:pt-1.5"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-visible pb-[min(5vh,42px)] lg:-translate-y-6 lg:pb-[min(4vh,34px)]">
          <div className="mb-0.5 flex shrink-0 flex-col gap-0.5 lg:mb-1 lg:gap-1">{headerBlock}</div>

          {/* Мобилка: сетка 2×6 без центрального постера */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
            <div className="grid min-h-0 min-w-0 flex-1 grid-cols-2 grid-rows-6 gap-1 overflow-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TRACKS.map((t) => renderTrackCard(t))}
            </div>
          </div>

          {/* Десктоп: ваша схема — две колонки треков и постер по центру (без рамок/карточек) */}
          <div className="hidden min-h-0 min-w-0 flex-1 gap-2 overflow-visible lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,min(34vw,420px))_minmax(0,1fr)] lg:items-start lg:gap-2 lg:pb-0 xl:gap-3">
            <div className="grid min-h-0 min-w-0 grid-rows-6 gap-1 overflow-visible pr-1 lg:-translate-y-1">
              {TRACKS_LEFT.map((t) => renderTrackCard(t))}
            </div>
            <div className="flex w-full flex-col items-center justify-start pt-0 lg:-translate-y-16">
              <img
                src={VIBE_HOST_PHOTO_SRC}
                alt=""
                className="h-auto w-auto max-w-[min(35vw,430px)] max-h-[min(68vh,700px)] object-contain object-top"
                draggable={false}
              />
            </div>
            <div className="grid min-h-0 min-w-0 grid-rows-6 gap-1 overflow-visible pl-1 lg:-translate-y-1">
              {TRACKS_RIGHT.map((t) => renderTrackCard(t))}
            </div>
          </div>

          {(onBackToBook || onPlayGame || onEnterWord) && (
            <div className="mt-2 flex shrink-0 flex-wrap items-center justify-center gap-2 pt-2 sm:mt-3 sm:gap-3 sm:pt-3">
              {onBackToBook && (
                <NeonGlassButton
                  accent
                  className="pointer-events-auto !h-[2.75rem] !w-[10.5rem] !px-4 !py-2 !text-center !text-[11px] sm:!h-[2.9rem] sm:!w-[11rem] sm:!text-sm"
                  onClick={onBackToBook}
                >
                  назад к книге
                </NeonGlassButton>
              )}
              {onPlayGame && (
                <NeonGlassButton
                  accent
                  className="pointer-events-auto !h-[2.75rem] !w-[10.5rem] !px-4 !py-2 !text-center !text-[11px] sm:!h-[2.9rem] sm:!w-[11rem] sm:!text-sm"
                  onClick={onPlayGame}
                >
                  Крутим удачу?
                </NeonGlassButton>
              )}
              {onEnterWord && (
                <NeonGlassButton
                  accent
                  className="pointer-events-auto !h-[2.75rem] !w-[10.5rem] !px-4 !py-2 !text-center !text-[11px] sm:!h-[2.9rem] sm:!w-[11rem] sm:!text-sm"
                  onClick={onEnterWord}
                >
                  ввести слово
                </NeonGlassButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
