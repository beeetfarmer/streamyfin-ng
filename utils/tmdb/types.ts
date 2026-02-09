export interface TmdbCreditItem {
  id: number;
  title?: string;
  name?: string;
  media_type: "movie" | "tv";
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  popularity: number;
  vote_average: number;
  character?: string;
  genre_ids: number[];
}

export interface TmdbCombinedCreditsResponse {
  id: number;
  cast: TmdbCreditItem[];
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovieDetail {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genres: TmdbGenre[];
  vote_average: number;
  runtime: number;
  credits: {
    cast: TmdbCastMember[];
  };
}

export interface TmdbTvDetail {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  genres: TmdbGenre[];
  vote_average: number;
  number_of_seasons: number;
  credits: {
    cast: TmdbCastMember[];
  };
}
