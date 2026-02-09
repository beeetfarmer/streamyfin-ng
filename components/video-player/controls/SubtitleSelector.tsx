import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Platform, View } from "react-native";
import {
  type OptionGroup,
  PlatformDropdown,
} from "@/components/PlatformDropdown";
import { ICON_SIZES } from "./constants";
import { useVideoContext } from "./contexts/VideoContext";
import type { Track } from "./types";

const SubtitleSelector = () => {
  const { subtitleTracks } = useVideoContext();

  const { subtitleIndex } = useLocalSearchParams<{
    subtitleIndex: string;
  }>();

  // Create stable identifier for tracks
  const subtitleTracksKey = useMemo(
    () =>
      subtitleTracks?.map((t: Track) => `${t.index}-${t.name}`).join(",") ?? "",
    [subtitleTracks],
  );

  // Transform subtitle tracks into OptionGroup format
  const optionGroups = useMemo<OptionGroup[]>(() => {
    if (!subtitleTracks || subtitleTracks.length === 0) {
      return [];
    }

    return [
      {
        title: "Subtitles",
        options: subtitleTracks.map((sub: Track) => ({
          type: "radio" as const,
          label: sub.name,
          value: sub.index.toString(),
          selected: subtitleIndex === sub.index.toString(),
          onPress: () => sub.setTrack(),
        })),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitleTracksKey, subtitleIndex]);

  // Memoize the trigger to prevent re-renders
  const trigger = useMemo(
    () => (
      <View className='aspect-square flex flex-col rounded-xl items-center justify-center p-2'>
        <MaterialIcons
          name='subtitles'
          size={ICON_SIZES.HEADER}
          color='white'
        />
      </View>
    ),
    [],
  );

  // Hide on TV platforms or if no subtitles available
  if (Platform.isTV || !subtitleTracks || subtitleTracks.length === 0) {
    return null;
  }

  return (
    <PlatformDropdown
      title='Subtitles'
      groups={optionGroups}
      trigger={trigger}
      expoUIConfig={{}}
      bottomSheetConfig={{
        enablePanDownToClose: true,
      }}
    />
  );
};

export default SubtitleSelector;
