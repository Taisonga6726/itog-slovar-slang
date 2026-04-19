import { describe, expect, it } from "vitest";
import {
  HYMN_TRACKS,
  HYMN_TRACK_FILENAMES,
  hymnAudioUrl,
  hymnDisplayTitle,
} from "./hymnTracks";

describe("hymnTracks", () => {
  it("ровно 12 версий", () => {
    expect(HYMN_TRACKS).toHaveLength(12);
    expect(HYMN_TRACK_FILENAMES).toHaveLength(12);
  });

  it("каждый src — путь /audio/ + encodeURIComponent имени файла", () => {
    for (const t of HYMN_TRACKS) {
      expect(t.src).toBe(`/audio/${encodeURIComponent(t.fileName)}`);
      expect(t.src).toMatch(/^\/audio\/.+\.mp3$/);
    }
  });

  it("id уникальны и стабильны", () => {
    const ids = HYMN_TRACKS.map((t) => t.id);
    expect(new Set(ids).size).toBe(12);
    expect(ids[0]).toBe("hymn-0");
    expect(ids[11]).toBe("hymn-11");
  });

  it("заголовок без .mp3", () => {
    expect(hymnDisplayTitle("HARD_ ROCK KRUTOY ART.mp3")).toContain("HARD");
    expect(hymnDisplayTitle("RAP START_ KACH.mp3")).not.toMatch(/\.mp3$/i);
  });

  it("hymnAudioUrl совпадает с ручным encodeURIComponent", () => {
    const f = "SHANSON_ GITAR garmonica.mp3";
    expect(hymnAudioUrl(f)).toBe("/audio/" + encodeURIComponent(f));
  });
});
