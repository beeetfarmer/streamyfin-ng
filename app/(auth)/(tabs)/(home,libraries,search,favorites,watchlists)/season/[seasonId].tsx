import { Ionicons } from "@expo/vector-icons";
import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { getTvShowsApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import { useAtom } from "jotai";
import type React from "react";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ContinueWatchingPoster from "@/components/ContinueWatchingPoster";
import { Text } from "@/components/common/Text";
import { TouchableItemRouter } from "@/components/common/TouchableItemRouter";
import { DownloadItems, DownloadSingleItem } from "@/components/DownloadItem";
import { Loader } from "@/components/Loader";
import { PlayedStatus } from "@/components/PlayedStatus";
import { useDownload } from "@/providers/DownloadProvider";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import {
  OfflineModeProvider,
  useOfflineMode,
} from "@/providers/OfflineModeProvider";
import { getDownloadedEpisodesForSeason } from "@/utils/downloads/offline-series";
import { getUserItemData } from "@/utils/jellyfin/user-library/getUserItemData";
import { runtimeTicksToSeconds } from "@/utils/time";

const SeasonEpisodesContent: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const {
    seasonId,
    seriesId,
    seasonNumber: seasonNumberParam,
  } = params as {
    seasonId: string;
    seriesId: string;
    seasonNumber?: string;
  };

  const isOffline = useOfflineMode();
  const [api] = useAtom(apiAtom);
  const [user] = useAtom(userAtom);
  const { getDownloadedItems, downloadedItems } = useDownload();

  const seasonNumber = seasonNumberParam ? Number(seasonNumberParam) : null;

  // Fetch season item data for title
  const { data: seasonItem } = useQuery({
    queryKey: ["season", seasonId],
    queryFn: async () => {
      return await getUserItemData({
        api,
        userId: user?.Id,
        itemId: seasonId,
      });
    },
    enabled: !isOffline && !!api && !!user?.Id && !!seasonId,
    staleTime: 60 * 1000,
  });

  // Fetch episodes for this season
  const {
    data: episodes,
    isPending,
    refetch: refetchEpisodes,
  } = useQuery({
    queryKey: [
      "seasonEpisodes",
      seriesId,
      isOffline ? seasonNumber : seasonId,
      isOffline,
      downloadedItems.length,
    ],
    queryFn: async () => {
      if (isOffline) {
        if (seasonNumber === null) return [];
        return getDownloadedEpisodesForSeason(
          getDownloadedItems(),
          seriesId,
          seasonNumber,
        );
      }

      if (!api || !user?.Id || !seriesId || !seasonId) return [];

      const res = await getTvShowsApi(api).getEpisodes({
        seriesId,
        userId: user.Id,
        seasonId,
        enableUserData: true,
        fields: ["MediaSources", "MediaStreams", "Overview", "Trickplay"],
      });

      return res.data.Items ?? [];
    },
    staleTime: isOffline ? Infinity : 0,
    enabled: isOffline
      ? !!seriesId && seasonNumber !== null
      : !!api && !!user?.Id && !!seriesId && !!seasonId,
  });

  // Refresh episode user data (watched progress bars) whenever the screen
  // regains focus, e.g. after returning from the player. The screen stays
  // mounted behind the player, so React Query won't refetch on its own.
  useFocusEffect(
    useCallback(() => {
      refetchEpisodes();
    }, [refetchEpisodes]),
  );

  // Set header title and action buttons
  useEffect(() => {
    const title = isOffline
      ? `Season ${seasonNumber}`
      : (seasonItem?.Name ?? "");

    navigation.setOptions({
      title,
      headerRight:
        !isOffline && episodes && episodes.length > 0
          ? () => (
              <View className='flex flex-row items-center space-x-2'>
                <PlayedStatus items={episodes} />
                {!Platform.isTV && (
                  <DownloadItems
                    title={t("item_card.download.download_season")}
                    items={episodes}
                    MissingDownloadIconComponent={() => (
                      <Ionicons name='download' size={20} color='white' />
                    )}
                    DownloadedIconComponent={() => (
                      <Ionicons name='download' size={20} color='#9333ea' />
                    )}
                  />
                )}
              </View>
            )
          : undefined,
    });
  }, [seasonItem, episodes, isOffline, seasonNumber]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior='automatic'
      contentContainerStyle={{
        paddingBottom: insets.bottom + 16,
      }}
    >
      <View className='px-4 flex flex-col mt-4'>
        {isPending ? (
          <View className='flex flex-col items-center justify-center py-8'>
            <Loader />
          </View>
        ) : (
          episodes?.map((e: BaseItemDto) => (
            <TouchableItemRouter
              item={e}
              key={e.Id}
              className='flex flex-col mb-4'
            >
              <View className='flex flex-row items-start mb-2'>
                <View className='mr-2'>
                  <ContinueWatchingPoster
                    size='small'
                    item={e}
                    useEpisodePoster
                  />
                </View>
                <View className='shrink'>
                  <Text numberOfLines={2}>{e.Name}</Text>
                  <Text numberOfLines={1} className='text-xs text-neutral-500'>
                    {`S${e.ParentIndexNumber?.toString()}:E${e.IndexNumber?.toString()}`}
                  </Text>
                  <Text className='text-xs text-neutral-500'>
                    {runtimeTicksToSeconds(e.RunTimeTicks)}
                  </Text>
                </View>
                {!isOffline && (
                  <View className='self-start ml-auto -mt-0.5'>
                    <DownloadSingleItem item={e} />
                  </View>
                )}
              </View>

              <Text
                numberOfLines={3}
                className='text-xs text-neutral-500 shrink'
              >
                {e.Overview}
              </Text>
            </TouchableItemRouter>
          ))
        )}
        {!isPending && (episodes?.length || 0) === 0 ? (
          <View className='flex flex-col'>
            <Text className='text-neutral-500'>
              {t("item_card.no_episodes_for_this_season")}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
};

const page: React.FC = () => {
  const params = useLocalSearchParams();
  const { offline: offlineParam } = params as { offline?: string };
  const isOffline = offlineParam === "true";

  return (
    <OfflineModeProvider isOffline={isOffline}>
      <SeasonEpisodesContent />
    </OfflineModeProvider>
  );
};

export default page;
