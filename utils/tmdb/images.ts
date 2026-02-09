const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export type TmdbImageSize =
  | "w92"
  | "w154"
  | "w185"
  | "w342"
  | "w500"
  | "w780"
  | "original";

export function getTmdbImageUrl(
  path: string | null | undefined,
  size: TmdbImageSize = "w342",
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
