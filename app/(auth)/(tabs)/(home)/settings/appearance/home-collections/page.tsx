import { getItemsApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { ScrollView, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/common/Text";
import { Loader } from "@/components/Loader";
import { ListGroup } from "@/components/list/ListGroup";
import { ListItem } from "@/components/list/ListItem";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { useSettings } from "@/utils/atoms/settings";

export default function HomeCollectionsPage() {
  const { settings, updateSettings } = useSettings();
  const user = useAtomValue(userAtom);
  const api = useAtomValue(apiAtom);
  const insets = useSafeAreaInsets();

  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["boxSets", user?.Id],
    queryFn: async () => {
      if (!api || !user?.Id) return [];

      const response = await getItemsApi(api).getItems({
        userId: user.Id,
        includeItemTypes: ["BoxSet"],
        recursive: true,
        fields: ["PrimaryImageAspectRatio"],
        sortBy: ["SortName"],
        sortOrder: ["Ascending"],
      });

      return response.data.Items || [];
    },
    enabled: !!api && !!user?.Id,
  });

  if (!settings) return null;

  if (isLoading)
    return (
      <View className='mt-4'>
        <Loader />
      </View>
    );

  if (!data || data.length === 0) {
    return (
      <View className='flex-1 justify-center items-center p-4'>
        <Text className='text-neutral-500 text-center'>
          {t("home.settings.appearance.no_collections_found")}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior='automatic'
      contentContainerStyle={{
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <ListGroup title={t("home.settings.appearance.home_collections")}>
        {data.map((collection) => (
          <ListItem
            key={collection.Id}
            title={collection.Name}
            onPress={() => {}}
          >
            <Switch
              value={
                settings.homeCollections?.includes(collection.Id!) || false
              }
              onValueChange={(value) => {
                updateSettings({
                  homeCollections: value
                    ? [...(settings.homeCollections || []), collection.Id!]
                    : settings.homeCollections?.filter(
                        (id) => id !== collection.Id,
                      ),
                });
              }}
            />
          </ListItem>
        ))}
      </ListGroup>
      <Text className='px-4 text-xs text-neutral-500 mt-1'>
        {t("home.settings.appearance.home_collections_description")}
      </Text>
    </ScrollView>
  );
}
