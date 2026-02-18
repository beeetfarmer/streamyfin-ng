import "@/augmentations";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import NetInfo from "@react-native-community/netinfo";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { onlineManager, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { getLocales } from "expo-localization";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Provider as JotaiProvider } from "jotai";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { Appearance, Platform } from "react-native";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from "react-native-safe-area-context";
import { GlobalModal } from "@/components/GlobalModal";
import i18n from "@/i18n";
import { DownloadProvider } from "@/providers/DownloadProvider";
import { GlobalModalProvider } from "@/providers/GlobalModalProvider";
import { IntroSheetProvider } from "@/providers/IntroSheetProvider";
import { JellyfinProvider } from "@/providers/JellyfinProvider";
import { MusicPlayerProvider } from "@/providers/MusicPlayerProvider";
import { NetworkStatusProvider } from "@/providers/NetworkStatusProvider";
import { PlaySettingsProvider } from "@/providers/PlaySettingsProvider";
import { ServerUrlProvider } from "@/providers/ServerUrlProvider";
import { WebSocketProvider } from "@/providers/WebSocketProvider";
import { useSettings } from "@/utils/atoms/settings";
import { LogProvider } from "@/utils/log";
import { storage } from "@/utils/mmkv";
import "react-native-reanimated";
import { Toaster } from "sonner-native";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

export default function RootLayout() {
  Appearance.setColorScheme("dark");

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <JotaiProvider>
        <ActionSheetProvider>
          <I18nextProvider i18n={i18n}>
            <SafeAreaProvider initialMetrics={initialWindowMetrics}>
              <Layout />
            </SafeAreaProvider>
          </I18nextProvider>
        </ActionSheetProvider>
      </JotaiProvider>
    </GestureHandlerRootView>
  );
}

// Set up online manager for network-aware query behavior
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60s - show cached data instantly, refetch in background when stale
      gcTime: 1000 * 60 * 60 * 24, // 24 hours - keep in cache for offline
      networkMode: "offlineFirst", // Return cache first, refetch if online
      refetchOnMount: true, // Refetch when component mounts
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnWindowFocus: false, // Not needed for mobile
      retry: (failureCount) => {
        if (!onlineManager.isOnline()) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      networkMode: "online", // Only run mutations when online
    },
  },
});

// Create MMKV-based persister for offline support
const mmkvPersister = createSyncStoragePersister({
  storage: {
    getItem: (key) => storage.getString(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.remove(key),
  },
});

function Layout() {
  const { settings } = useSettings();

  useEffect(() => {
    i18n.changeLanguage(
      settings?.preferedLanguage ?? getLocales()[0].languageCode ?? "en",
    );
  }, [settings?.preferedLanguage, i18n]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: mmkvPersister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours max cache age
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Only persist successful queries
            return query.state.status === "success";
          },
        },
      }}
    >
      <JellyfinProvider>
        <ServerUrlProvider>
          <NetworkStatusProvider>
            <PlaySettingsProvider>
              <LogProvider>
                <WebSocketProvider>
                  <DownloadProvider>
                    <MusicPlayerProvider>
                      <GlobalModalProvider>
                        <BottomSheetModalProvider>
                          <IntroSheetProvider>
                            <ThemeProvider value={DarkTheme}>
                              <SystemBars style='light' hidden={false} />
                              <Stack initialRouteName='(auth)/(tabs)'>
                                <Stack.Screen
                                  name='(auth)/(tabs)'
                                  options={{
                                    headerShown: false,
                                    title: "",
                                    header: () => null,
                                  }}
                                />
                                <Stack.Screen
                                  name='(auth)/player'
                                  options={{
                                    headerShown: false,
                                    title: "",
                                    header: () => null,
                                  }}
                                />
                                <Stack.Screen
                                  name='(auth)/now-playing'
                                  options={{
                                    headerShown: false,
                                    presentation: "modal",
                                    gestureEnabled: true,
                                  }}
                                />
                                <Stack.Screen
                                  name='login'
                                  options={{
                                    headerShown: true,
                                    title: "",
                                    headerTransparent: Platform.OS === "ios",
                                  }}
                                />
                                <Stack.Screen name='+not-found' />
                              </Stack>
                              <Toaster
                                duration={4000}
                                toastOptions={{
                                  style: {
                                    backgroundColor: "#262626",
                                    borderColor: "#363639",
                                    borderWidth: 1,
                                  },
                                  titleStyle: {
                                    color: "white",
                                  },
                                }}
                                closeButton
                              />
                              <GlobalModal />
                            </ThemeProvider>
                          </IntroSheetProvider>
                        </BottomSheetModalProvider>
                      </GlobalModalProvider>
                    </MusicPlayerProvider>
                  </DownloadProvider>
                </WebSocketProvider>
              </LogProvider>
            </PlaySettingsProvider>
          </NetworkStatusProvider>
        </ServerUrlProvider>
      </JellyfinProvider>
    </PersistQueryClientProvider>
  );
}
