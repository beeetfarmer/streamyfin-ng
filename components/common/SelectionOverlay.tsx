import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { View } from "react-native";

/**
 * Dims a card and shows a checkbox in the corner while in selection mode.
 * Render as the last child of a `relative`/absolute-positioned container.
 */
export const SelectionOverlay: React.FC<{ selected: boolean }> = ({
  selected,
}) => {
  return (
    <View className='absolute inset-0 items-end justify-start p-1'>
      {selected && <View className='absolute inset-0 bg-black/40' />}
      <View
        className={`h-6 w-6 rounded-full items-center justify-center border-2 ${
          selected
            ? "bg-purple-600 border-purple-600"
            : "bg-black/40 border-white"
        }`}
      >
        {selected && <Ionicons name='checkmark' size={16} color='white' />}
      </View>
    </View>
  );
};
