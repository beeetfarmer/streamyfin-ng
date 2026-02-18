import "react-native-url-polyfill/auto";
import TrackPlayer from "react-native-track-player";
import { PlaybackService } from "./services/PlaybackService";
import "expo-router/entry";

if (!__DEV__) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

TrackPlayer.registerPlaybackService(() => PlaybackService);
