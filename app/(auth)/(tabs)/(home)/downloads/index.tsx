import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useNavigation } from "expo-router";
import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { Text } from "@/components/common/Text";
import ActiveDownloads from "@/components/downloads/ActiveDownloads";
import { DownloadSize } from "@/components/downloads/DownloadSize";
import { MovieCard } from "@/components/downloads/MovieCard";
import { SeriesCard } from "@/components/downloads/SeriesCard";
import useRouter from "@/hooks/useAppRouter";
import { useSelection } from "@/hooks/useSelection";
import { useDownload } from "@/providers/DownloadProvider";
import { type DownloadedItem } from "@/providers/Downloads/types";
import { OfflineModeProvider } from "@/providers/OfflineModeProvider";
import { queueAtom } from "@/utils/atoms/queue";
import { confirmDelete } from "@/utils/confirmDelete";
import { writeToLog } from "@/utils/log";

export default function page() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [_queue, _setQueue] = useAtom(queueAtom);
  const {
    downloadedItems,
    deleteFileByType,
    deleteAllFiles,
    deleteItems,
    getDownloadedItemSize,
  } = useDownload();
  const router = useRouter();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const {
    selectionMode,
    setSelectionMode,
    selected,
    count: selectedCount,
    isSelected,
    toggle,
    setMany,
    exitSelection,
  } = useSelection();

  const [showMigration, setShowMigration] = useState(false);

  const _insets = useSafeAreaInsets();

  const migration_20241124 = () => {
    Alert.alert(
      t("home.downloads.new_app_version_requires_re_download"),
      t("home.downloads.new_app_version_requires_re_download_description"),
      [
        {
          text: t("home.downloads.back"),
          onPress: () => {
            setShowMigration(false);
            router.back();
          },
        },
        {
          text: t("home.downloads.delete"),
          style: "destructive",
          onPress: async () => {
            await deleteAllFiles();
            setShowMigration(false);
          },
        },
      ],
    );
  };

  const downloadedFiles = useMemo(() => downloadedItems, [downloadedItems]);

  const movies = useMemo(() => {
    try {
      return downloadedFiles?.filter((f) => f.item.Type === "Movie") || [];
    } catch {
      setShowMigration(true);
      return [];
    }
  }, [downloadedFiles]);

  const groupedBySeries = useMemo(() => {
    try {
      const episodes = downloadedFiles?.filter(
        (f) => f.item.Type === "Episode",
      );
      const series: { [key: string]: DownloadedItem[] } = {};
      episodes?.forEach((e) => {
        if (!series[e.item.SeriesName!]) series[e.item.SeriesName!] = [];
        series[e.item.SeriesName!].push(e);
      });
      return Object.values(series);
    } catch {
      setShowMigration(true);
      return [];
    }
  }, [downloadedFiles]);

  const otherMedia = useMemo(() => {
    try {
      return (
        downloadedFiles?.filter(
          (f) => f.item.Type !== "Movie" && f.item.Type !== "Episode",
        ) || []
      );
    } catch {
      setShowMigration(true);
      return [];
    }
  }, [downloadedFiles]);

  // --- Multi-select helpers ---

  /** Sum the on-disk size (bytes) of the given downloaded item ids. */
  const sizeOf = useCallback(
    (ids: string[]) =>
      ids.reduce((sum, id) => sum + (getDownloadedItemSize(id) || 0), 0),
    [getDownloadedItemSize],
  );

  const allSelectableIds = useMemo(() => {
    const ids: string[] = [];
    for (const m of movies) if (m.item.Id) ids.push(m.item.Id);
    for (const group of groupedBySeries)
      for (const e of group) if (e.item.Id) ids.push(e.item.Id);
    for (const o of otherMedia) if (o.item.Id) ids.push(o.item.Id);
    return ids;
  }, [movies, groupedBySeries, otherMedia]);

  const allSelected =
    allSelectableIds.length > 0 && selectedCount === allSelectableIds.length;

  const toggleSeries = useCallback(
    (episodes: BaseItemDto[]) => {
      const ids = episodes.map((e) => e.Id).filter((id): id is string => !!id);
      const allIn = ids.every((id) => selected.has(id));
      setMany(ids, !allIn);
    },
    [selected, setMany],
  );

  const isSeriesSelected = useCallback(
    (episodes: BaseItemDto[]) => {
      const ids = episodes.map((e) => e.Id).filter((id): id is string => !!id);
      return ids.length > 0 && ids.every((id) => selected.has(id));
    },
    [selected],
  );

  const handleSelectAllToggle = useCallback(() => {
    if (allSelected) {
      setMany(allSelectableIds, false);
    } else {
      setMany(allSelectableIds, true);
    }
  }, [allSelected, allSelectableIds, setMany]);

  const handleDeleteSelected = useCallback(() => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    confirmDelete({
      title: t("home.downloads.confirm_delete_title"),
      message: t("home.downloads.confirm_delete_selected", {
        count: ids.length,
        size: sizeOf(ids).bytesToReadable(),
      }),
      confirmText: t("home.downloads.delete"),
      cancelText: t("home.downloads.cancel"),
      onConfirm: async () => {
        await deleteItems(ids);
        exitSelection();
      },
    });
  }, [selected, sizeOf, deleteItems, exitSelection, t]);

  // --- Per-section "delete all" handlers ---

  const handleDeleteAllMovies = useCallback(() => {
    const ids = movies.map((m) => m.item.Id).filter((id): id is string => !!id);
    confirmDelete({
      title: t("home.downloads.delete_all_movies_button"),
      message: t("home.downloads.confirm_delete_all_movies", {
        count: ids.length,
        size: sizeOf(ids).bytesToReadable(),
      }),
      confirmText: t("home.downloads.delete"),
      cancelText: t("home.downloads.cancel"),
      onConfirm: () => deleteFileByType("Movie"),
    });
  }, [movies, sizeOf, deleteFileByType, t]);

  const handleDeleteAllSeries = useCallback(() => {
    const ids = groupedBySeries
      .flat()
      .map((e) => e.item.Id)
      .filter((id): id is string => !!id);
    confirmDelete({
      title: t("home.downloads.delete_all_tvseries_button"),
      message: t("home.downloads.confirm_delete_all_tvseries", {
        count: ids.length,
        size: sizeOf(ids).bytesToReadable(),
      }),
      confirmText: t("home.downloads.delete"),
      cancelText: t("home.downloads.cancel"),
      onConfirm: () => deleteFileByType("Episode"),
    });
  }, [groupedBySeries, sizeOf, deleteFileByType, t]);

  const handleDeleteAllOther = useCallback(() => {
    const ids = otherMedia
      .map((o) => o.item.Id)
      .filter((id): id is string => !!id);
    confirmDelete({
      title: t("home.downloads.delete_all_other_media_button"),
      message: t("home.downloads.confirm_delete_all_other", {
        count: ids.length,
        size: sizeOf(ids).bytesToReadable(),
      }),
      confirmText: t("home.downloads.delete"),
      cancelText: t("home.downloads.cancel"),
      onConfirm: () => deleteItems(ids),
    });
  }, [otherMedia, sizeOf, deleteItems, t]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        selectionMode ? (
          <View className='flex flex-row items-center'>
            <TouchableOpacity
              onPress={handleDeleteSelected}
              disabled={selectedCount === 0}
              className='px-2'
            >
              <Ionicons
                name='trash-outline'
                size={22}
                color={selectedCount === 0 ? "#6b7280" : "#ef4444"}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={exitSelection} className='px-2'>
              <Text className='text-purple-400'>
                {t("home.downloads.done")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className='flex flex-row items-center'>
            {allSelectableIds.length > 0 && (
              <TouchableOpacity
                onPress={() => setSelectionMode(true)}
                className='px-2'
              >
                <Text className='text-purple-400'>
                  {t("home.downloads.select")}
                </Text>
              </TouchableOpacity>
            )}
            <Pressable
              onPress={bottomSheetModalRef.current?.present}
              className='px-2'
            >
              <DownloadSize items={downloadedFiles?.map((f) => f.item) || []} />
            </Pressable>
          </View>
        ),
    });
  }, [
    downloadedFiles,
    selectionMode,
    selectedCount,
    allSelectableIds.length,
    handleDeleteSelected,
    exitSelection,
    setSelectionMode,
    t,
  ]);

  useEffect(() => {
    if (showMigration) {
      migration_20241124();
    }
  }, [showMigration]);

  const _deleteMovies = () =>
    deleteFileByType("Movie")
      .then(() =>
        toast.success(
          t("home.downloads.toasts.deleted_all_movies_successfully"),
        ),
      )
      .catch((reason) => {
        writeToLog("ERROR", reason);
        toast.error(t("home.downloads.toasts.failed_to_delete_all_movies"));
      });
  const _deleteShows = () =>
    deleteFileByType("Episode")
      .then(() =>
        toast.success(
          t("home.downloads.toasts.deleted_all_tvseries_successfully"),
        ),
      )
      .catch((reason) => {
        writeToLog("ERROR", reason);
        toast.error(t("home.downloads.toasts.failed_to_delete_all_tvseries"));
      });
  const _deleteOtherMedia = () =>
    Promise.all(
      otherMedia
        .filter((item) => item.item.Type)
        .map((item) =>
          deleteFileByType(item.item.Type!)
            .then(() =>
              toast.success(
                t("home.downloads.toasts.deleted_media_successfully", {
                  type: item.item.Type,
                }),
              ),
            )
            .catch((reason) => {
              writeToLog("ERROR", reason);
              toast.error(
                t("home.downloads.toasts.failed_to_delete_media", {
                  type: item.item.Type,
                }),
              );
            }),
        ),
    );

  const renderSectionHeader = ({
    title,
    count,
    onDeleteAll,
  }: {
    title: string;
    count: number;
    onDeleteAll: () => void;
  }) => (
    <View className='flex flex-row items-center justify-between mb-2 px-4'>
      <View className='flex flex-row items-center'>
        <Text className='text-lg font-bold mr-2'>{title}</Text>
        <View className='bg-purple-600 rounded-full h-6 w-6 flex items-center justify-center'>
          <Text className='text-xs font-bold'>{count}</Text>
        </View>
      </View>
      {!selectionMode && (
        <TouchableOpacity onPress={onDeleteAll} className='px-2 py-1'>
          <Text className='text-xs text-red-400'>
            {t("home.downloads.delete_all_button")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <OfflineModeProvider isOffline={true}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior='automatic'
      >
        <View style={{ paddingTop: Platform.OS === "android" ? 17 : 0 }}>
          {selectionMode && (
            <View className='flex flex-row items-center justify-between mb-3 px-4'>
              <Text className='font-semibold'>
                {t("home.downloads.selected_count", { count: selectedCount })}
              </Text>
              <TouchableOpacity
                onPress={handleSelectAllToggle}
                className='px-2'
              >
                <Text className='text-purple-400'>
                  {allSelected
                    ? t("home.downloads.deselect_all")
                    : t("home.downloads.select_all")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View className='mb-4 flex flex-col space-y-4 px-4'>
            <ActiveDownloads />
          </View>

          {movies.length > 0 && (
            <View className='mb-4'>
              {renderSectionHeader({
                title: t("home.downloads.movies"),
                count: movies.length,
                onDeleteAll: handleDeleteAllMovies,
              })}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className='px-4 flex flex-row'>
                  {movies?.map((item) => (
                    <MovieCard
                      item={item.item}
                      key={item.item.Id}
                      selectionMode={selectionMode}
                      selected={item.item.Id ? isSelected(item.item.Id) : false}
                      onToggleSelect={(i) => i.Id && toggle(i.Id)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
          {groupedBySeries.length > 0 && (
            <View className='mb-4'>
              {renderSectionHeader({
                title: t("home.downloads.tvseries"),
                count: groupedBySeries.length,
                onDeleteAll: handleDeleteAllSeries,
              })}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className='px-4 flex flex-row'>
                  {groupedBySeries?.map((items) => (
                    <View
                      className='mb-2 last:mb-0'
                      key={items[0].item.SeriesId}
                    >
                      <SeriesCard
                        items={items.map((i) => i.item)}
                        selectionMode={selectionMode}
                        selected={isSeriesSelected(items.map((i) => i.item))}
                        onToggleSelect={toggleSeries}
                      />
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {otherMedia.length > 0 && (
            <View className='mb-4'>
              {renderSectionHeader({
                title: t("home.downloads.other_media"),
                count: otherMedia.length,
                onDeleteAll: handleDeleteAllOther,
              })}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className='px-4 flex flex-row'>
                  {otherMedia?.map((item) => (
                    <MovieCard
                      item={item.item}
                      key={item.item.Id}
                      selectionMode={selectionMode}
                      selected={item.item.Id ? isSelected(item.item.Id) : false}
                      onToggleSelect={(i) => i.Id && toggle(i.Id)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
          {downloadedFiles?.length === 0 && (
            <View className='flex px-4'>
              <Text className='opacity-50'>
                {t("home.downloads.no_downloaded_items")}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </OfflineModeProvider>
  );
}
