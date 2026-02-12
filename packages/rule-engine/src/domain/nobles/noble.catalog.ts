import type { GemColor } from "@repo/shared-types";

export interface NobleTileCatalogEntry {
  id: string;
  points: 3;
  requirement: Record<GemColor, number>;
}

// Base-game noble tiles: each requires 3 bonuses in three distinct colors.
// Rulebook wording reference (braille rules mirror):
// https://www.64ouncegames.com/pages/splendor
export const NOBLE_TILES: readonly NobleTileCatalogEntry[] = [
  {
    id: "noble-01",
    points: 3,
    requirement: {
      diamond: 3,
      sapphire: 3,
      emerald: 3,
      ruby: 0,
      onyx: 0,
    },
  },
  {
    id: "noble-02",
    points: 3,
    requirement: {
      diamond: 3,
      sapphire: 3,
      emerald: 0,
      ruby: 3,
      onyx: 0,
    },
  },
  {
    id: "noble-03",
    points: 3,
    requirement: {
      diamond: 3,
      sapphire: 3,
      emerald: 0,
      ruby: 0,
      onyx: 3,
    },
  },
  {
    id: "noble-04",
    points: 3,
    requirement: {
      diamond: 3,
      sapphire: 0,
      emerald: 3,
      ruby: 3,
      onyx: 0,
    },
  },
  {
    id: "noble-05",
    points: 3,
    requirement: {
      diamond: 3,
      sapphire: 0,
      emerald: 3,
      ruby: 0,
      onyx: 3,
    },
  },
  {
    id: "noble-06",
    points: 3,
    requirement: {
      diamond: 3,
      sapphire: 0,
      emerald: 0,
      ruby: 3,
      onyx: 3,
    },
  },
  {
    id: "noble-07",
    points: 3,
    requirement: {
      diamond: 0,
      sapphire: 3,
      emerald: 3,
      ruby: 3,
      onyx: 0,
    },
  },
  {
    id: "noble-08",
    points: 3,
    requirement: {
      diamond: 0,
      sapphire: 3,
      emerald: 3,
      ruby: 0,
      onyx: 3,
    },
  },
  {
    id: "noble-09",
    points: 3,
    requirement: {
      diamond: 0,
      sapphire: 3,
      emerald: 0,
      ruby: 3,
      onyx: 3,
    },
  },
  {
    id: "noble-10",
    points: 3,
    requirement: {
      diamond: 0,
      sapphire: 0,
      emerald: 3,
      ruby: 3,
      onyx: 3,
    },
  },
];
