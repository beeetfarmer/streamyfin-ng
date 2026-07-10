import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { Image } from "expo-image";
import type React from "react";
import { useCallback, useMemo } from "react";
import { TouchableOpacity, View } from "react-native";
import { DownloadSize } from "@/components/downloads/DownloadSize";
import useRouter from "@/hooks/useAppRouter";
import { useDownload } from "@/providers/DownloadProvider";
import { storage } from "@/utils/mmkv";
import { SelectionOverlay } from "../common/SelectionOverlay";
import { Text } from "../common/Text";

interface SeriesCardProps {
  items: BaseItemDto[];
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (items: BaseItemDto[]) => void;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({
  items,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}) => {
  const { deleteItems } = useDownload();
  const { showActionSheetWithOptions } = useActionSheet();
  const router = useRouter();

  const base64Image = useMemo(() => {
    return storage.getString(items[0].SeriesId!);
  }, []);

  const deleteSeries = useCallback(
    async () =>
      deleteItems(
        items.map((item) => item.Id).filter((id) => id !== undefined),
      ),
    [items],
  );

  const showActionSheet = useCallback(() => {
    const options = ["Delete", "Cancel"];
    const destructiveButtonIndex = 0;

    showActionSheetWithOptions(
      {
        options,
        destructiveButtonIndex,
      },
      (selectedIndex) => {
        if (selectedIndex === destructiveButtonIndex) {
          deleteSeries();
        }
      },
    );
  }, [showActionSheetWithOptions, deleteSeries]);

  const handlePress = useCallback(() => {
    if (selectionMode) {
      onToggleSelect?.(items);
      return;
    }
    router.push({
      pathname: "/series/[id]",
      params: { id: items[0].SeriesId!, offline: "true" },
    });
  }, [selectionMode, onToggleSelect, items, router]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={selectionMode ? undefined : showActionSheet}
    >
      {base64Image ? (
        <View className='relative w-28 aspect-[10/15] rounded-lg overflow-hidden mr-2 border border-neutral-900'>
          <Image
            source={{
              uri: `data:image/jpeg;base64,${base64Image}`,
            }}
            style={{
              width: "100%",
              height: "100%",
            }}
            contentFit='cover'
          />
          <View className='bg-purple-600 rounded-full h-6 w-6 flex items-center justify-center absolute bottom-1 right-1'>
            <Text className='text-xs font-bold'>{items.length}</Text>
          </View>
          {selectionMode && <SelectionOverlay selected={selected} />}
        </View>
      ) : (
        <View className='relative w-28 aspect-[10/15] rounded-lg bg-neutral-900 mr-2 flex items-center justify-center'>
          <Ionicons
            name='image-outline'
            size={24}
            color='gray'
            className='self-center mt-16'
          />
          {selectionMode && <SelectionOverlay selected={selected} />}
        </View>
      )}

      <View className='w-28 mt-2 flex flex-col'>
        <Text numberOfLines={2} className=''>
          {items[0].SeriesName}
        </Text>
        <Text className='text-xs opacity-50'>{items[0].ProductionYear}</Text>
        <DownloadSize items={items} />
      </View>
    </TouchableOpacity>
  );
};
