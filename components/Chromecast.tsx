import { Feather } from "@expo/vector-icons";
import { useCallback } from "react";
import { Platform } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import GoogleCast, {
  CastButton,
  CastContext,
  useMediaStatus,
} from "react-native-google-cast";
import { RoundButton } from "./RoundButton";

export function Chromecast({
  width = 48,
  height = 48,
  background = "transparent",
  ...props
}) {
  const discoveryManager = GoogleCast.getDiscoveryManager();
  const mediaStatus = useMediaStatus();

  const showCastControls = useCallback(async () => {
    if (!discoveryManager) {
      console.warn("DiscoveryManager is not initialized");
      return;
    }

    await discoveryManager.startDiscovery();
    if (mediaStatus?.currentItemId) CastContext.showExpandedControls();
    else CastContext.showCastDialog();
  }, [discoveryManager, mediaStatus?.currentItemId]);

  // Android requires the cast button to be present for startDiscovery to work
  const AndroidCastButton = useCallback(
    () =>
      Platform.OS === "android" ? <CastButton tintColor='transparent' /> : null,
    [Platform.OS],
  );

  if (Platform.OS === "ios") {
    return (
      <Pressable className='mr-4' onPress={showCastControls} {...props}>
        <AndroidCastButton />
        <Feather name='cast' size={22} color={"white"} />
      </Pressable>
    );
  }

  if (background === "transparent")
    return (
      <RoundButton
        size='large'
        className='mr-2'
        background={false}
        onPress={showCastControls}
        {...props}
      >
        <AndroidCastButton />
        <Feather name='cast' size={22} color={"white"} />
      </RoundButton>
    );

  return (
    <RoundButton size='large' onPress={showCastControls} {...props}>
      <AndroidCastButton />
      <Feather name='cast' size={22} color={"white"} />
    </RoundButton>
  );
}
