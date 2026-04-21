/**
 * 12 аудиоверсий гимна. Порядок в массиве = `grid-cols-2` по строкам: левый | правый.
 * Левая колонка (6): CLASSICAL → HARD → POP-ROCK → RAP START → RAP KACH → ROCK POP KACH.
 * Правая колонка (6): ROCK POP WOW → BARABAN → KRUTOY WOW → SHANSON garmonica → TANYA → ACUSTIC.
 *
 * Имена совпадают с `public/audio/*.mp3`.
 */
export const HYMN_TRACK_FILENAMES = [
  "CLASSICAL CHOIR MARCH.mp3",
  "ROCK- POP WOW.mp3",
  "HARD_ ROCK KRUTOY ART.mp3",
  "ROCK_ ART BARABAN WOW.mp3",
  "POP-ROCK COMMIT.mp3",
  "ROCK_ KRUTOY ART WOW.mp3",
  "RAP START.mp3",
  "SHANSON_ GITAR garmonica.mp3",
  "RAP START_ KACH.mp3",
  "SHANSON_ GITAR TANYA for TP.mp3",
  "ROCK- POP KACH.mp3",
  "SHANSON_ACUSTIC GITAR.mp3",
] as const;

export type HymnTrackFilename = (typeof HYMN_TRACK_FILENAMES)[number];

export function hymnAudioUrl(fileName: string): string {
  return `/audio/${encodeURIComponent(fileName)}`;
}

/** Подпись в UI: без .mp3, подчёркивания → пробел для читаемости */
export function hymnDisplayTitle(fileName: string): string {
  return fileName
    .replace(/\.mp3$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface HymnTrack {
  id: string;
  fileName: string;
  title: string;
  src: string;
}

export const HYMN_TRACKS: HymnTrack[] = HYMN_TRACK_FILENAMES.map((fileName, i) => ({
  id: `hymn-${i}`,
  fileName,
  title: hymnDisplayTitle(fileName),
  src: hymnAudioUrl(fileName),
}));
