import { useNavigation } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Linking,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { Text } from "@/components/common/Text";
import { ListGroup } from "@/components/list/ListGroup";
import { ListItem } from "@/components/list/ListItem";
import { useSettings } from "@/utils/atoms/settings";

export default function TmdbSettingsPage() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();

  const [showCastInfo, setShowCastInfo] = useState(
    settings?.showTmdbCastInfo ?? false,
  );
  const [apiKey, setApiKey] = useState(settings?.tmdbApiKey ?? "");

  const onSave = useCallback(() => {
    updateSettings({
      showTmdbCastInfo: showCastInfo,
      tmdbApiKey: apiKey || undefined,
    });
    toast.success(t("home.settings.plugins.tmdb.toasts.saved"));
  }, [showCastInfo, apiKey, updateSettings, t]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={onSave}>
          <Text className='text-blue-500 font-medium'>
            {t("home.settings.plugins.tmdb.save")}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, onSave, t]);

  if (!settings) return null;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior='automatic'
      contentContainerStyle={{
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <View className='px-4'>
        <ListGroup className='flex-1'>
          <ListItem title={t("home.settings.plugins.tmdb.show_cast_info")}>
            <Switch value={showCastInfo} onValueChange={setShowCastInfo} />
          </ListItem>
        </ListGroup>

        <Text className='px-4 text-xs text-neutral-500 mt-1'>
          {t("home.settings.plugins.tmdb.show_cast_info_hint")}
        </Text>

        {showCastInfo && (
          <>
            <ListGroup className='mt-4'>
              <ListItem title={t("home.settings.plugins.tmdb.api_key")}>
                <TextInput
                  className='text-white text-right flex-1'
                  placeholder={t(
                    "home.settings.plugins.tmdb.api_key_placeholder",
                  )}
                  value={apiKey}
                  onChangeText={setApiKey}
                  autoCapitalize='none'
                  autoCorrect={false}
                  secureTextEntry
                  returnKeyType='done'
                />
              </ListItem>
            </ListGroup>

            <Text className='px-4 text-xs text-neutral-500 mt-1'>
              {t("home.settings.plugins.tmdb.api_key_hint")}{" "}
              <Text
                className='text-blue-500'
                onPress={() =>
                  Linking.openURL("https://www.themoviedb.org/settings/api")
                }
              >
                {t("home.settings.plugins.tmdb.get_api_key")}
              </Text>
            </Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}
