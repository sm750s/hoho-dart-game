export type Theme = "forest" | "sea" | "space";
export type Decoration = "plain" | "star";
export type Cosmetics = { theme: Theme; decoration: Decoration };
export const DEFAULT_COSMETICS: Cosmetics = { theme: "forest", decoration: "plain" };
export const TREASURES = [
  { id: "forest", name: "기본 숲 테마", stars: 0 },
  { id: "sea", name: "바다 테마", stars: 3 },
  { id: "star", name: "별빛 다트", stars: 5 },
  { id: "space", name: "우주 테마", stars: 8 },
] as const;

export function restoreCosmetics(value: unknown, stars: number): Cosmetics {
  if (!value || typeof value !== "object") return { ...DEFAULT_COSMETICS };
  const candidate = value as Partial<Cosmetics>;
  const theme = candidate.theme === "sea" && stars >= 3 ? "sea"
    : candidate.theme === "space" && stars >= 8 ? "space" : "forest";
  return { theme, decoration: candidate.decoration === "star" && stars >= 5 ? "star" : "plain" };
}
