import { Ionicons } from "@expo/vector-icons";
import { getTvShowsApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useAtom } from "jotai";
import type React from "react";
import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Platform, TouchableOpacity, View } from "react-native";
import { AddToFavorites } from "@/components/AddToFavorites";
import { Text } from "@/components/common/Text";
import { DownloadItems } from "@/components/DownloadItem";
import { ItemPeopleSections } from "@/components/item/ItemPeopleSections";
import { ParallaxScrollView } from "@/components/ParallaxPage";
import { NextUp } from "@/components/series/NextUp";
import { SeasonGrid } from "@/components/series/SeasonGrid";
import { SeriesHeader } from "@/components/series/SeriesHeader";
import { useDownload } from "@/providers/DownloadProvider";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { OfflineModeProvider } from "@/providers/OfflineModeProvider";
import { confirmDelete } from "@/utils/confirmDelete";
import {
  buildOfflineSeriesFromEpisodes,
  getDownloadedEpisodesForSeries,
} from "@/utils/downloads/offline-series";
import { getBackdropUrl } from "@/utils/jellyfin/image/getBackdropUrl";
import { getLogoImageUrlById } from "@/utils/jellyfin/image/getLogoImageUrlById";
import { getUserItemData } from "@/utils/jellyfin/user-library/getUserItemData";
import { storage } from "@/utils/mmkv";

const page: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const { id: seriesId, offline: offlineParam } = params as {
    id: string;
    offline?: string;
  };

  const isOffline = offlineParam === "true";

  const [api] = useAtom(apiAtom);
  const [user] = useAtom(userAtom);
  const {
    getDownloadedItems,
    downloadedItems,
    deleteItems,
    getDownloadedItemSize,
  } = useDownload();

  // For offline mode, construct series data from downloaded episodes
  // Include downloadedItems.length so query refetches when items are deleted
  const { data: item } = useQuery({
    queryKey: ["series", seriesId, isOffline, downloadedItems.length],
    queryFn: async () => {
      if (isOffline) {
        return buildOfflineSeriesFromEpisodes(getDownloadedItems(), seriesId);
      }
      return await getUserItemData({
        api,
        userId: user?.Id,
        itemId: seriesId,
      });
    },
    staleTime: isOffline ? Infinity : 60 * 1000,
    enabled: isOffline || (!!api && !!user?.Id),
  });

  // For offline mode, use stored base64 image
  const base64Image = useMemo(() => {
    if (isOffline) {
      return storage.getString(seriesId);
    }
    return null;
  }, [isOffline, seriesId]);

  const backdropUrl = useMemo(() => {
    if (isOffline && base64Image) {
      return `data:image/jpeg;base64,${base64Image}`;
    }
    return getBackdropUrl({
      api,
      item,
      quality: 90,
      width: 1000,
    });
  }, [isOffline, base64Image, api, item]);

  const logoUrl = useMemo(() => {
    if (isOffline) {
      return null; // No logo in offline mode
    }
    return getLogoImageUrlById({
      api,
      item,
    });
  }, [isOffline, api, item]);

  const { data: allEpisodes, isLoading } = useQuery({
    queryKey: ["AllEpisodes", seriesId, isOffline, downloadedItems.length],
    queryFn: async () => {
      if (isOffline) {
        return getDownloadedEpisodesForSeries(getDownloadedItems(), seriesId);
      }
      if (!api || !user?.Id) return [];

      const res = await getTvShowsApi(api).getEpisodes({
        seriesId: seriesId,
        userId: user.Id,
        enableUserData: true,
        fields: ["MediaSources", "MediaStreams", "Overview", "Trickplay"],
      });
      return res?.data.Items || [];
    },
    select: (data) =>
      [...(data || [])].sort(
        (a, b) =>
          (a.ParentIndexNumber ?? 0) - (b.ParentIndexNumber ?? 0) ||
          (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0),
      ),
    staleTime: isOffline ? Infinity : 60,
    enabled: isOffline || (!!api && !!user?.Id),
  });

  const handleDeleteAllForShow = useCallback(() => {
    const ids = (allEpisodes ?? [])
      .map((e) => e.Id)
      .filter((id): id is string => !!id);
    if (ids.length === 0) return;
    const size = ids.reduce(
      (sum, id) => sum + (getDownloadedItemSize(id) || 0),
      0,
    );
    confirmDelete({
      title: t("home.downloads.confirm_delete_show_title"),
      message: t("home.downloads.confirm_delete_show", {
        count: ids.length,
        size: size.bytesToReadable(),
      }),
      confirmText: t("home.downloads.delete"),
      cancelText: t("home.downloads.cancel"),
      onConfirm: () => deleteItems(ids),
    });
  }, [allEpisodes, getDownloadedItemSize, deleteItems, t]);

  useEffect(() => {
    // In offline mode, offer a "delete all downloads for this show" action.
    if (isOffline) {
      navigation.setOptions({
        headerRight: () =>
          !Platform.isTV && allEpisodes && allEpisodes.length > 0 ? (
            <TouchableOpacity
              onPress={handleDeleteAllForShow}
              className='px-2 flex flex-row items-center'
            >
              <Ionicons name='trash-outline' size={20} color='#ef4444' />
              <Text className='text-red-400 ml-1 text-xs'>
                {t("home.downloads.delete_downloads_for_show_button")}
              </Text>
            </TouchableOpacity>
          ) : null,
      });
      return;
    }

    navigation.setOptions({
      headerRight: () =>
        !isLoading && item && allEpisodes && allEpisodes.length > 0 ? (
          <View className='flex flex-row items-center space-x-2'>
            <AddToFavorites item={item} />
            {!Platform.isTV && (
              <DownloadItems
                size='large'
                title={t("item_card.download.download_series")}
                items={allEpisodes}
                MissingDownloadIconComponent={() => (
                  <Ionicons name='download' size={22} color='white' />
                )}
                DownloadedIconComponent={() => (
                  <Ionicons
                    name='checkmark-done-outline'
                    size={24}
                    color='#9333ea'
                  />
                )}
              />
            )}
          </View>
        ) : null,
    });
  }, [allEpisodes, isLoading, item, isOffline, handleDeleteAllForShow, t]);

  // For offline mode, we can show the page even without backdropUrl
  if (!item || (!isOffline && !backdropUrl)) return null;

  return (
    <OfflineModeProvider isOffline={isOffline}>
      <ParallaxScrollView
        headerHeight={400}
        headerImage={
          backdropUrl ? (
            <Image
              source={{
                uri: backdropUrl,
              }}
              style={{
                width: "100%",
                height: "100%",
              }}
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#1a1a1a",
              }}
            />
          )
        }
        logo={
          logoUrl ? (
            <Image
              source={{
                uri: logoUrl,
              }}
              style={{
                height: 130,
                width: "100%",
              }}
              contentFit='contain'
            />
          ) : undefined
        }
      >
        <View className='flex flex-col pt-4'>
          <SeriesHeader item={item} />
          {!isOffline && (
            <View className='mb-6'>
              <NextUp seriesId={seriesId} />
            </View>
          )}
          <View className='mb-6'>
            <SeasonGrid item={item} />
          </View>
          {!isOffline && item && (
            <ItemPeopleSections item={item} className='mt-6' />
          )}
        </View>
      </ParallaxScrollView>
    </OfflineModeProvider>
  );
};

export default page;
