import type { BaseItemDtoQueryResult } from "@jellyfin/sdk/lib/generated-client/models";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useAtom } from "jotai";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InfiniteHorizontalScroll } from "@/components/common/InfiniteHorizontalScroll";
import { Text } from "@/components/common/Text";
import { TouchableItemRouter } from "@/components/common/TouchableItemRouter";
import { ItemCardText } from "@/components/ItemCardText";
import { Loader } from "@/components/Loader";
import { OverviewText } from "@/components/OverviewText";
import { TmdbOtherCredits } from "@/components/person/TmdbOtherCredits";
import MoviePoster from "@/components/posters/MoviePoster";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { getPrimaryImageUrl } from "@/utils/jellyfin/image/getPrimaryImageUrl";
import { getUserItemData } from "@/utils/jellyfin/user-library/getUserItemData";

const page: React.FC = () => {
  const local = useLocalSearchParams();
  const { personId } = local as { personId: string };
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [api] = useAtom(apiAtom);
  const [user] = useAtom(userAtom);

  const { data: item, isLoading: l1 } = useQuery({
    queryKey: ["item", personId],
    queryFn: async () =>
      await getUserItemData({
        api,
        userId: user?.Id,
        itemId: personId,
      }),
    enabled: !!personId && !!api,
    staleTime: 60,
  });

  const tmdbPersonId = item?.ProviderIds?.Tmdb ?? undefined;

  const { data: libraryItemsForExclusion } = useQuery({
    queryKey: ["person", "libraryTmdbIds", personId],
    queryFn: async () => {
      if (!api || !user?.Id) return [];
      const response = await getItemsApi(api).getItems({
        userId: user.Id,
        personIds: [personId],
        includeItemTypes: ["Movie", "Series"],
        recursive: true,
        fields: ["ProviderIds"],
        limit: 200,
      });
      return response.data.Items ?? [];
    },
    enabled: !!api && !!user?.Id && !!tmdbPersonId,
    staleTime: 5 * 60 * 1000,
  });

  const excludeTmdbIds = useMemo(() => {
    const ids = new Set<string>();
    for (const libraryItem of libraryItemsForExclusion ?? []) {
      const tmdbId = libraryItem.ProviderIds?.Tmdb;
      if (tmdbId) ids.add(tmdbId);
    }
    return ids;
  }, [libraryItemsForExclusion]);

  const fetchItems = useCallback(
    async ({
      pageParam,
    }: {
      pageParam: number;
    }): Promise<BaseItemDtoQueryResult | null> => {
      if (!api || !user?.Id) return null;

      const response = await getItemsApi(api).getItems({
        userId: user.Id,
        personIds: [personId],
        startIndex: pageParam,
        limit: 16,
        sortOrder: ["Descending", "Descending", "Ascending"],
        includeItemTypes: ["Movie", "Series"],
        recursive: true,
        fields: [
          "ParentId",
          "PrimaryImageAspectRatio",
          "ParentId",
          "PrimaryImageAspectRatio",
        ],
        sortBy: ["PremiereDate", "ProductionYear", "SortName"],
        collapseBoxSetItems: false,
      });

      return response.data;
    },
    [api, user?.Id, personId],
  );

  const primaryImageUrl = useMemo(
    () =>
      getPrimaryImageUrl({
        api,
        item,
        quality: 90,
        width: 400,
      }),
    [item, api],
  );

  if (l1)
    return (
      <View className='justify-center items-center h-full'>
        <Loader />
      </View>
    );

  if (!item?.Id) return null;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior='automatic'
      contentContainerStyle={{
        paddingBottom: insets.bottom + 16,
      }}
    >
      <View className='flex flex-col space-y-4 my-4'>
        <View className='px-4 flex-row mb-4'>
          <View className='w-36 aspect-[2/3] rounded-lg overflow-hidden bg-neutral-800'>
            {primaryImageUrl ? (
              <Image
                source={{ uri: primaryImageUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit='cover'
              />
            ) : null}
          </View>
          <View className='flex-1 ml-4 justify-end'>
            <Text className='text-2xl font-bold text-neutral-100'>
              {item.Name}
            </Text>
            {item.PremiereDate && (
              <Text className='text-sm text-neutral-400 mt-1'>
                {new Date(item.PremiereDate).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            )}
          </View>
        </View>

        {item.Overview && (
          <View className='px-4 mb-4'>
            <OverviewText text={item.Overview} />
          </View>
        )}

        <View className='mb-4'>
          <Text className='px-4 text-2xl font-bold mb-2 text-neutral-100'>
            {t("item_card.appeared_in")}
          </Text>
          <InfiniteHorizontalScroll
            height={247}
            renderItem={(i, idx) => (
              <TouchableItemRouter
                key={idx}
                item={i}
                className={`flex flex-col
                ${"w-28"}
              `}
              >
                <View>
                  <MoviePoster item={i} />
                  <ItemCardText item={i} />
                </View>
              </TouchableItemRouter>
            )}
            queryFn={fetchItems}
            queryKey={["actor", "movies", personId]}
          />
        </View>
        <TmdbOtherCredits
          tmdbPersonId={tmdbPersonId}
          excludeTmdbIds={excludeTmdbIds}
        />
      </View>
    </ScrollView>
  );
};

export default page;
