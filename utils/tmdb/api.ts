import type {
  TmdbCombinedCreditsResponse,
  TmdbMovieDetail,
  TmdbTvDetail,
} from "./types";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function tmdbFetch<T>(path: string, apiKey: string): Promise<T> {
  const url = `${TMDB_BASE_URL}${path}${path.includes("?") ? "&" : "?"}api_key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }
  return response.json();
}

export async function getTmdbCombinedCredits(
  tmdbPersonId: string,
  apiKey: string,
): Promise<TmdbCombinedCreditsResponse> {
  return tmdbFetch(`/person/${tmdbPersonId}/combined_credits`, apiKey);
}

export async function getTmdbMovieDetail(
  movieId: number,
  apiKey: string,
): Promise<TmdbMovieDetail> {
  return tmdbFetch(`/movie/${movieId}?append_to_response=credits`, apiKey);
}

export async function getTmdbTvDetail(
  tvId: number,
  apiKey: string,
): Promise<TmdbTvDetail> {
  return tmdbFetch(`/tv/${tvId}?append_to_response=credits`, apiKey);
}
