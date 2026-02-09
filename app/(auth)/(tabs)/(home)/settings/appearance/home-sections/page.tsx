import { Ionicons } from "@expo/vector-icons";
import { getItemsApi, getUserViewsApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Switch, View } from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/common/Text";
import { Loader } from "@/components/Loader";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { useSettings } from "@/utils/atoms/settings";

type SectionItem = {
  key: string;
  title: string;
  visible: boolean;
};

export default function HomeSectionsPage() {
  const { settings, updateSettings } = useSettings();
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Fetch user libraries
  const { data: userViews, isLoading: loadingViews } = useQuery({
    queryKey: ["user-views", user?.Id],
    queryFn: async () => {
      if (!api || !user?.Id) return [];
      const response = await getUserViewsApi(api).getUserViews({
        userId: user.Id,
      });
      return response.data.Items || [];
    },
    enabled: !!api && !!user?.Id,
  });

  // Fetch BoxSet collections
  const { data: boxSets, isLoading: loadingBoxSets } = useQuery({
    queryKey: ["boxSets", user?.Id],
    queryFn: async () => {
      if (!api || !user?.Id) return [];
      const response = await getItemsApi(api).getItems({
        userId: user.Id,
        includeItemTypes: ["BoxSet"],
        recursive: true,
        sortBy: ["SortName"],
        sortOrder: ["Ascending"],
      });
      return response.data.Items || [];
    },
    enabled: !!api && !!user?.Id,
  });

  // Build list of all available sections
  const sectionItems = useMemo((): SectionItem[] => {
    const items: SectionItem[] = [];

    // Default sections
    if (settings?.mergeNextUpAndContinueWatching) {
      items.push({
        key: "home-continueAndNextUp",
        title: t("home.continue_and_next_up"),
        visible: !settings?.hiddenHomeSections?.includes(
          "home-continueAndNextUp",
        ),
      });
    } else {
      items.push({
        key: "home-resumeItems",
        title: t("home.continue_watching"),
        visible: !settings?.hiddenHomeSections?.includes("home-resumeItems"),
      });
      items.push({
        key: "home-nextUp-all",
        title: t("home.next_up"),
        visible: !settings?.hiddenHomeSections?.includes("home-nextUp-all"),
      });
    }

    // Recently Added sections for each library
    const collections =
      userViews?.filter(
        (c) =>
          c.CollectionType &&
          ["movies", "tvshows"].includes(c.CollectionType) &&
          !settings?.hiddenLibraries?.includes(c.Id!),
      ) || [];

    for (const collection of collections) {
      const key = `home-recentlyAddedIn${collection.CollectionType}-${user?.Id}-${collection.Id}`;
      items.push({
        key,
        title: t("home.recently_added_in", { libraryName: collection.Name }),
        visible: !settings?.hiddenHomeSections?.includes(key),
      });
    }

    // User's enabled collections (BoxSets)
    if (
      settings?.homeCollections &&
      settings.homeCollections.length > 0 &&
      boxSets
    ) {
      for (const collectionId of settings.homeCollections) {
        const collection = boxSets.find((b) => b.Id === collectionId);
        if (collection) {
          const key = `home-collection-${user?.Id}-${collection.Id}`;
          items.push({
            key,
            title: collection.Name || "Collection",
            visible: !settings?.hiddenHomeSections?.includes(key),
          });
        }
      }
    }

    // Suggested movies (only if StreamyStats recommendations are disabled)
    if (!settings?.streamyStatsMovieRecommendations) {
      const key = `home-suggestedMovies-${user?.Id}`;
      items.push({
        key,
        title: t("home.suggested_movies"),
        visible: !settings?.hiddenHomeSections?.includes(key),
      });
    }

    // Apply saved order
    if (settings?.homeSectionOrder?.length) {
      const orderMap = new Map(
        settings.homeSectionOrder.map((key, index) => [key, index]),
      );
      items.sort((a, b) => {
        const orderA = orderMap.get(a.key) ?? 999;
        const orderB = orderMap.get(b.key) ?? 999;
        return orderA - orderB;
      });
    }

    return items;
  }, [
    settings?.mergeNextUpAndContinueWatching,
    settings?.hiddenHomeSections,
    settings?.hiddenLibraries,
    settings?.homeCollections,
    settings?.homeSectionOrder,
    settings?.streamyStatsMovieRecommendations,
    userViews,
    boxSets,
    user?.Id,
    t,
  ]);

  const toggleVisibility = useCallback(
    (key: string) => {
      const hidden = settings?.hiddenHomeSections || [];
      const isHidden = hidden.includes(key);
      updateSettings({
        hiddenHomeSections: isHidden
          ? hidden.filter((k) => k !== key)
          : [...hidden, key],
      });
    },
    [settings?.hiddenHomeSections, updateSettings],
  );

  const onDragEnd = useCallback(
    ({ data }: { data: SectionItem[] }) => {
      updateSettings({
        homeSectionOrder: data.map((item) => item.key),
      });
    },
    [updateSettings],
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<SectionItem>) => {
      return (
        <ScaleDecorator>
          <View
            className='flex-row items-center justify-between px-4 py-3'
            style={{
              backgroundColor: isActive
                ? "rgba(255,255,255,0.1)"
                : "transparent",
            }}
          >
            <Text className='flex-1 text-white' numberOfLines={1}>
              {item.title}
            </Text>
            <View className='flex-row items-center'>
              <Switch
                value={item.visible}
                onValueChange={() => toggleVisibility(item.key)}
              />
              <TouchableOpacity
                onLongPress={drag}
                delayLongPress={100}
                style={{ marginLeft: 12, padding: 4 }}
              >
                <Ionicons name='reorder-three' size={24} color='gray' />
              </TouchableOpacity>
            </View>
          </View>
        </ScaleDecorator>
      );
    },
    [toggleVisibility],
  );

  if (!settings) return null;

  if (loadingViews || loadingBoxSets) {
    return (
      <View className='mt-4'>
        <Loader />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <DraggableFlatList
        data={sectionItems}
        onDragEnd={onDragEnd}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListHeaderComponent={
          <Text className='px-4 py-2 text-sm font-semibold text-neutral-400 uppercase'>
            {t("home.settings.appearance.home_sections")}
          </Text>
        }
        ListFooterComponent={
          <Text className='px-4 text-xs text-neutral-500 mt-2 mb-8'>
            {t("home.settings.appearance.home_sections_description")}
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}
