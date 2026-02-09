import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useQuery } from "@tanstack/react-query";
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
              <ItemImage item={season} variant='Primary' width={200} />
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
