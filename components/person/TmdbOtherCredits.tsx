import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import { HorizontalScroll } from "@/components/common/HorizontalScroll";
import { Text } from "@/components/common/Text";
import TmdbPoster from "@/components/posters/TmdbPoster";
import useRouter from "@/hooks/useAppRouter";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSettings } from "@/utils/atoms/settings";
import { getTmdbCombinedCredits } from "@/utils/tmdb/api";
import type { TmdbCreditItem } from "@/utils/tmdb/types";

interface TmdbOtherCreditsProps {
  tmdbPersonId: string | undefined;
  excludeTmdbIds: Set<string>;
}

function sortByYearDesc(a: TmdbCreditItem, b: TmdbCreditItem) {
  const yearA = (a.release_date || a.first_air_date || "").substring(0, 4);
  const yearB = (b.release_date || b.first_air_date || "").substring(0, 4);
  return yearB.localeCompare(yearA);
}

export const TmdbOtherCredits: React.FC<TmdbOtherCreditsProps> = ({
  tmdbPersonId,
  excludeTmdbIds,
}) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { isConnected } = useNetworkStatus();
  const router = useRouter();

  const enabled =
    !!settings.showTmdbCastInfo &&
    !!settings.tmdbApiKey &&
    !!tmdbPersonId &&
    isConnected;

  const { data: credits } = useQuery({
    queryKey: ["tmdb", "combinedCredits", tmdbPersonId],
    queryFn: () => getTmdbCombinedCredits(tmdbPersonId!, settings.tmdbApiKey!),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const { movies, shows } = useMemo(() => {
    if (!credits?.cast) return { movies: [], shows: [] };
    const filtered = credits.cast.filter(
      (item) => !excludeTmdbIds.has(String(item.id)),
    );
    return {
      movies: filtered
        .filter((item) => item.media_type === "movie")
        .sort(sortByYearDesc),
      shows: filtered
        .filter((item) => item.media_type === "tv")
        .sort(sortByYearDesc),
    };
  }, [credits, excludeTmdbIds]);

  if (!enabled || (movies.length === 0 && shows.length === 0)) return null;

  const renderItem = (item: TmdbCreditItem) => (
    <TouchableOpacity
      onPress={() => {
        router.push({
          pathname: "/tmdb/[id]",
          params: { id: String(item.id), mediaType: item.media_type },
        });
      }}
      className='flex flex-col w-28'
    >
      <TmdbPoster posterPath={item.poster_path} />
      <Text
        numberOfLines={2}
        className='mt-1 text-xs text-neutral-100'
        style={{ lineHeight: 16, height: 32 }}
      >
        {item.title || item.name}
      </Text>
      <Text className='text-xs text-neutral-500'>
        {(item.release_date || item.first_air_date || "").substring(0, 4)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View>
      {shows.length > 0 && (
        <View className='mb-4'>
          <Text className='px-4 text-2xl font-bold mb-2 text-neutral-100'>
            {t("item_card.other_shows")}
          </Text>
          <HorizontalScroll data={shows} height={247} renderItem={renderItem} />
        </View>
      )}
      {movies.length > 0 && (
        <View>
          <Text className='px-4 text-2xl font-bold mb-2 text-neutral-100'>
            {t("item_card.other_movies")}
          </Text>
          <HorizontalScroll
            data={movies}
            height={247}
            renderItem={renderItem}
          />
        </View>
      )}
    </View>
  );
};
