import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Platform, ScrollView, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListGroup } from "@/components/list/ListGroup";
import { ListItem } from "@/components/list/ListItem";
import { LocalNetworkSettings } from "@/components/settings/LocalNetworkSettings";
import { apiAtom } from "@/providers/JellyfinProvider";
import { storage } from "@/utils/mmkv";
import {
  getServerHost,
  isHttpUrl,
  isInsecureHttpAllowedForHost,
  setInsecureHttpAllowedForHost,
} from "@/utils/networkSecurity";

export default function NetworkSettingsPage() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const api = useAtomValue(apiAtom);

  const remoteUrl = storage.getString("serverUrl");
  const remoteHost = useMemo(
    () => (remoteUrl ? getServerHost(remoteUrl) : null),
    [remoteUrl],
  );
  const hasHttpRemoteUrl = useMemo(
    () => (remoteUrl ? isHttpUrl(remoteUrl) : false),
    [remoteUrl],
  );

  const [allowInsecureHttp, setAllowInsecureHttp] = useState<boolean>(() =>
    isInsecureHttpAllowedForHost(remoteHost),
  );

  useEffect(() => {
    setAllowInsecureHttp(isInsecureHttpAllowedForHost(remoteHost));
  }, [remoteHost]);

  const handleInsecureHttpToggle = useCallback(
    (enabled: boolean) => {
      if (!remoteHost) return;

      if (enabled) {
        Alert.alert(
          "Allow insecure HTTP?",
          `Allow HTTP and ws:// for ${remoteHost}? This is less secure and can expose your traffic to interception.`,
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: "Allow",
              style: "destructive",
              onPress: () => {
                setInsecureHttpAllowedForHost(remoteHost, true);
                setAllowInsecureHttp(true);
              },
            },
          ],
        );
        return;
      }

      setInsecureHttpAllowedForHost(remoteHost, false);
      setAllowInsecureHttp(false);
    },
    [remoteHost, t],
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior='automatic'
      contentContainerStyle={{
        paddingLeft: insets.left,
        paddingRight: insets.right,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <View
        className='p-4 flex flex-col'
        style={{ paddingTop: Platform.OS === "android" ? 10 : 0 }}
      >
        <ListGroup title={t("home.settings.network.current_server")}>
          <ListItem
            title={t("home.settings.network.remote_url")}
            subtitle={remoteUrl ?? t("home.settings.network.not_configured")}
          />
          <ListItem
            title={t("home.settings.network.active_url")}
            subtitle={api?.basePath ?? t("home.settings.network.not_connected")}
          />
          <ListItem
            title='Allow insecure HTTP'
            subtitle={
              remoteHost
                ? hasHttpRemoteUrl
                  ? `Enabled for ${remoteHost}`
                  : `Control HTTP fallback for ${remoteHost}`
                : "Connect to a server first"
            }
            disabled={!remoteHost}
          >
            <Switch
              value={allowInsecureHttp}
              onValueChange={handleInsecureHttpToggle}
              disabled={!remoteHost}
            />
          </ListItem>
        </ListGroup>

        <View className='mt-4'>
          <LocalNetworkSettings />
        </View>
      </View>
    </ScrollView>
  );
}
