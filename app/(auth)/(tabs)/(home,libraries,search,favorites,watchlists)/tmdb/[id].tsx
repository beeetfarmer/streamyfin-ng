import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { HorizontalScroll } from "@/components/common/HorizontalScroll";
import { Text } from "@/components/common/Text";
import { Loader } from "@/components/Loader";
import { OverviewText } from "@/components/OverviewText";
import { ParallaxScrollView } from "@/components/ParallaxPage";
import { useSettings } from "@/utils/atoms/settings";
import { getTmdbMovieDetail, getTmdbTvDetail } from "@/utils/tmdb/api";
import { getTmdbImageUrl } from "@/utils/tmdb/images";
import type {
  TmdbCastMember,
  TmdbMovieDetail,
  TmdbTvDetail,
} from "@/utils/tmdb/types";

const TmdbDetailPage: React.FC = () => {
  const { id, mediaType } = useLocalSearchParams<{
    id: string;
    mediaType: "movie" | "tv";
  }>();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const apiKey = settings.tmdbApiKey;

  const { data: movieDetail, isLoading: movieLoading } = useQuery({
    queryKey: ["tmdb", "movie", id],
    queryFn: () => getTmdbMovieDetail(Number(id), apiKey!),
    enabled: mediaType === "movie" && !!apiKey,
    staleTime: 5 * 60 * 1000,
  });

  const { data: tvDetail, isLoading: tvLoading } = useQuery({
    queryKey: ["tmdb", "tv", id],
    queryFn: () => getTmdbTvDetail(Number(id), apiKey!),
    enabled: mediaType === "tv" && !!apiKey,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = movieLoading || tvLoading;
  const detail: TmdbMovieDetail | TmdbTvDetail | undefined =
    mediaType === "movie" ? movieDetail : tvDetail;

  const title = detail ? ("title" in detail ? detail.title : detail.name) : "";

  const year = useMemo(() => {
    if (!detail) return "";
    const date =
      "release_date" in detail ? detail.release_date : detail.first_air_date;
    return (date || "").substring(0, 4);
  }, [detail]);

  const genres = useMemo(() => {
    if (!detail?.genres) return "";
    return detail.genres.map((g) => g.name).join(", ");
  }, [detail]);

  const backdropUrl = getTmdbImageUrl(detail?.backdrop_path, "w780");

  const cast = useMemo(() => {
    return detail?.credits?.cast?.slice(0, 20) ?? [];
  }, [detail]);

  if (isLoading) {
    return (
      <View className='justify-center items-center h-full'>
        <Loader />
      </View>
    );
  }

  if (!detail) return null;

  return (
    <ParallaxScrollView
      headerImage={
        backdropUrl ? (
          <Image
            source={{ uri: backdropUrl }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <View className='w-full h-full bg-neutral-900' />
        )
      }
    >
      <View className='flex flex-col space-y-4 my-4'>
        <View className='px-4 mb-4'>
          <Text className='text-2xl font-bold text-neutral-100'>{title}</Text>
          <View className='flex flex-row items-center mt-1 mb-2'>
            {year ? (
              <Text className='text-sm text-neutral-400'>{year}</Text>
            ) : null}
            {genres ? (
              <Text className='text-sm text-neutral-400 ml-2'>{genres}</Text>
            ) : null}
          </View>
          <OverviewText text={detail.overview} />
        </View>

        {cast.length > 0 && (
          <View>
            <Text className='px-4 text-2xl font-bold mb-2 text-neutral-100'>
              {t("item_card.cast_and_crew")}
            </Text>
            <HorizontalScroll
              data={cast}
              height={200}
              renderItem={(member: TmdbCastMember) => {
                const profileUrl = getTmdbImageUrl(member.profile_path, "w185");
                return (
                  <View className='flex flex-col w-24 items-center'>
                    <View className='rounded-full overflow-hidden w-20 h-20 bg-neutral-800'>
                      {profileUrl ? (
                        <Image
                          source={{ uri: profileUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit='cover'
                        />
                      ) : null}
                    </View>
                    <Text
                      numberOfLines={2}
                      className='mt-1 text-xs text-neutral-100 text-center'
                    >
                      {member.name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className='text-xs text-neutral-500 text-center'
                    >
                      {member.character}
                    </Text>
                  </View>
                );
              }}
            />
          </View>
        )}
      </View>
    </ParallaxScrollView>
  );
};

export default TmdbDetailPage;
