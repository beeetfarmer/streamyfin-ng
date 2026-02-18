import { Ionicons } from "@expo/vector-icons";
import {
  type BottomTabNavigationEventMap,
  type BottomTabNavigationOptions,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import type {
  ParamListBase,
  TabNavigationState,
} from "@react-navigation/native";
import { withLayoutContext } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { MiniPlayerBar } from "@/components/music/MiniPlayerBar";
import { MusicPlaybackEngine } from "@/components/music/MusicPlaybackEngine";
import { Colors } from "@/constants/Colors";
import { useSettings } from "@/utils/atoms/settings";
import { eventBus } from "@/utils/eventBus";

const { Navigator } = createBottomTabNavigator();

export const Tabs = withLayoutContext<
  BottomTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  BottomTabNavigationEventMap
>(Navigator, undefined, true);

export default function TabLayout() {
  const { settings } = useSettings();
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#121212",
            borderTopColor: "#1f1f1f",
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: "#8f8f8f",
          sceneStyle: {
            backgroundColor: "black",
          },
        }}
      >
        <Tabs.Screen redirect name='index' />
        <Tabs.Screen
          listeners={(_e) => ({
            tabPress: (_e) => {
              eventBus.emit("scrollToTop");
            },
          })}
          name='(home)'
          options={{
            title: t("tabs.home"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name='home' color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          listeners={(_e) => ({
            tabPress: (_e) => {
              eventBus.emit("searchTabPressed");
            },
          })}
          name='(search)'
          options={{
            title: t("tabs.search"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name='search' color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name='(favorites)'
          options={{
            title: t("tabs.favorites"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name='heart' color={color} size={size} />
            ),
          }}
        />
        {!!settings?.streamyStatsServerUrl && !settings?.hideWatchlistsTab && (
          <Tabs.Screen
            name='(watchlists)'
            options={{
              title: t("watchlists.title"),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name='list' color={color} size={size} />
              ),
            }}
          />
        )}
        <Tabs.Screen
          name='(libraries)'
          options={{
            title: t("tabs.library"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name='server' color={color} size={size} />
            ),
          }}
        />
        {!!settings?.showCustomMenuLinks && (
          <Tabs.Screen
            name='(custom-links)'
            options={{
              title: t("tabs.custom_links"),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name='menu' color={color} size={size} />
              ),
            }}
          />
        )}
      </Tabs>
      <MiniPlayerBar />
      <MusicPlaybackEngine />
    </View>
  );
}
