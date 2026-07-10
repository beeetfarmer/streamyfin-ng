import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ItemImage } from "@/components/common/ItemImage";
import { Text } from "@/components/common/Text";
import { WatchedIndicator } from "@/components/WatchedIndicator";
import useRouter from "@/hooks/useAppRouter";
import { useDownload } from "@/providers/DownloadProvider";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { useOfflineMode } from "@/providers/OfflineModeProvider";
import { buildOfflineSeasons } from "@/utils/downloads/offline-series";
import { storage } from "@/utils/mmkv";

/**
 * Renders a season poster. When offline the API is unavailable, so use the
 * images stored in mmkv at download time, in order of preference: the real
 * season poster (keyed by SeasonId), then the first downloaded episode's cover
 * (keyed by its id), then the series primary image (keyed by SeriesId).
 */
const SeasonPoster: React.FC<{ season: BaseItemDto; isOffline: boolean }> = ({
  season,
  isOffline,
}) => {
  const base64Image = isOffline
    ? (season.SeasonId ? storage.getString(season.SeasonId) : undefined) ||
      storage.getString((season as { EpisodeId?: string }).EpisodeId ?? "") ||
      (season.SeriesId ? storage.getString(season.SeriesId) : undefined)
    : undefined;

  if (base64Image) {
    return (
      <Image
        source={{ uri: `data:image/jpeg;base64,${base64Image}` }}
        style={{ width: "100%", height: "100%" }}
        contentFit='cover'
      />
    );
  }

  return <ItemImage item={season} variant='Primary' width={200} />;
};

type Props = {
  item: BaseItemDto;
};

export const SeasonGrid: React.FC<Props> = ({ item }) => {
  const [api] = useAtom(apiAtom);
  const [user] = useAtom(userAtom);
  const { t } = useTranslation();
  const isOffline = useOfflineMode();
  const { getDownloadedItems, downloadedItems } = useDownload();
  const router = useRouter();

  const { data: seasons } = useQuery({
    queryKey: ["seasons", item.Id, isOffline, downloadedItems.length],
    queryFn: async () => {
      if (isOffline) {
        return buildOfflineSeasons(getDownloadedItems(), item.Id!);
      }

      if (!api || !user?.Id || !item.Id) return [];
      const response = await api.axiosInstance.get(
        `${api.basePath}/Shows/${item.Id}/Seasons`,
        {
          params: {
            userId: user?.Id,
            itemId: item.Id,
            Fields:
              "ItemCounts,PrimaryImageAspectRatio,CanDelete,MediaSourceCount",
          },
          headers: {
            Authorization: `MediaBrowser DeviceId="${api.deviceInfo.id}", Token="${api.accessToken}"`,
          },
        },
      );

      return response.data.Items as BaseItemDto[];
    },
    staleTime: isOffline ? Infinity : 60,
    enabled: isOffline || (!!api && !!user?.Id && !!item.Id),
  });

  if (!seasons?.length) return null;

  return (
    <View>
      <Text className='text-lg font-bold mb-2 px-4'>
        {t("item_card.seasons")}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {seasons.map((season: BaseItemDto) => (
          <TouchableOpacity
            key={season.Id}
            className='w-28'
            onPress={() => {
              router.push({
                pathname: "/season/[seasonId]",
                params: {
                  seasonId: season.Id!,
                  seriesId: item.Id!,
                  seasonNumber: String(season.IndexNumber ?? 0),
                },
              });
            }}
          >
            <View className='relative aspect-[2/3] rounded-lg overflow-hidden bg-neutral-900'>
              <SeasonPoster season={season} isOffline={isOffline} />
              <WatchedIndicator item={season} />
            </View>
            <Text numberOfLines={2} className='text-xs text-center mt-1'>
              {season.Name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
