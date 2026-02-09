import { Ionicons } from "@expo/vector-icons";
import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import type React from "react";
import { View } from "react-native";
import { Text } from "./common/Text";

export const WatchedIndicator: React.FC<{ item: BaseItemDto }> = ({ item }) => {
  const userData = item.UserData;

  // Fully watched — show checkmark
  if (userData?.Played) {
    return (
      <View className='absolute top-1 right-1 bg-purple-600 rounded-full w-5 h-5 items-center justify-center'>
        <Ionicons name='checkmark' size={14} color='white' />
      </View>
    );
  }

  // Series/BoxSet with unwatched episodes — show count badge
  if (
    (item.Type === "Series" ||
      item.Type === "BoxSet" ||
      item.Type === "Season") &&
    userData?.UnplayedItemCount != null &&
    userData.UnplayedItemCount > 0
  ) {
    return (
      <View className='absolute top-1 right-1 bg-purple-600 rounded-full min-w-5 h-5 px-1 items-center justify-center'>
        <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>
          {userData.UnplayedItemCount}
        </Text>
      </View>
    );
  }

  // Unwatched movie/episode — show triangle corner
  if (
    userData?.Played === false &&
    (item.Type === "Movie" || item.Type === "Episode")
  ) {
    return (
      <View className='bg-purple-600 w-8 h-8 absolute -top-4 -right-4 rotate-45' />
    );
  }

  return null;
};
