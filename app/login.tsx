import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { PublicSystemInfo } from "@jellyfin/sdk/lib/generated-client";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { t } from "i18next";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { Button } from "@/components/Button";
import { Input } from "@/components/common/Input";
import { Text } from "@/components/common/Text";
import JellyfinServerDiscovery from "@/components/JellyfinServerDiscovery";
import { PreviousServersList } from "@/components/PreviousServersList";
import { SaveAccountModal } from "@/components/SaveAccountModal";
import { Colors } from "@/constants/Colors";
import { apiAtom, useJellyfin } from "@/providers/JellyfinProvider";
import {
  allowInsecureHttpForUrl,
  forceProtocol,
  getServerHost,
  isHttpUrl,
  isInsecureHttpAllowedForUrl,
  normalizeServerUrl,
} from "@/utils/networkSecurity";
import type {
  AccountSecurityType,
  SavedServer,
} from "@/utils/secureCredentials";

const CredentialsSchema = z.object({
  username: z.string().min(1, t("login.username_required")),
});

const Login: React.FC = () => {
  const api = useAtomValue(apiAtom);
  const navigation = useNavigation();
  const params =
    useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const {
    setServer,
    login,
    removeServer,
    initiateQuickConnect,
    loginWithSavedCredential,
    loginWithPassword,
  } = useJellyfin();

  const deepLinkApiUrl = Array.isArray(params.apiUrl)
    ? params.apiUrl[0]
    : params.apiUrl;
  const deepLinkUsername = Array.isArray(params.username)
    ? params.username[0]
    : params.username;
  const deepLinkPassword = Array.isArray(params.password)
    ? params.password[0]
    : params.password;

  const [loadingServerCheck, setLoadingServerCheck] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [serverURL, setServerURL] = useState<string>(deepLinkApiUrl || "");
  const [serverName, setServerName] = useState<string>("");
  const [credentials, setCredentials] = useState<{
    username: string;
    password: string;
  }>({
    username: "",
    password: "",
  });

  // Save account state
  const [saveAccount, setSaveAccount] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const deepLinkNoticeShownRef = useRef(false);

  // Deep links can prefill server URL only. Credential parameters are ignored.
  useEffect(() => {
    if (deepLinkNoticeShownRef.current) {
      return;
    }

    let hasShownNotice = false;

    if (!deepLinkApiUrl) {
    } else {
      const normalized = normalizeServerUrl(deepLinkApiUrl);
      if (normalized) {
        setServerURL(normalized);
      } else {
        Alert.alert(
          t("login.connection_failed"),
          "Invalid deep link server URL.",
        );
        hasShownNotice = true;
      }
    }

    if (deepLinkUsername || deepLinkPassword) {
      Alert.alert(
        "Security notice",
        "Credential parameters in deep links are blocked. Enter credentials in the app instead.",
      );
      hasShownNotice = true;
    }

    const allowedParams = new Set(["apiUrl"]);
    const unexpectedParams = Object.keys(params).filter(
      (key) => !allowedParams.has(key),
    );
    if (unexpectedParams.length > 0) {
      Alert.alert(
        "Security notice",
        "Unsupported deep link parameters were ignored.",
      );
      hasShownNotice = true;
    }

    if (hasShownNotice) {
      deepLinkNoticeShownRef.current = true;
    }
  }, [deepLinkApiUrl, deepLinkUsername, deepLinkPassword, params]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: serverName,
      headerLeft: () =>
        api?.basePath ? (
          <TouchableOpacity
            onPress={() => {
              removeServer();
            }}
            className='flex flex-row items-center pr-2 pl-1'
          >
            <Ionicons name='chevron-back' size={18} color={Colors.primary} />
            <Text className=' ml-1 text-purple-600'>
              {t("login.change_server")}
            </Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [serverName, navigation, api?.basePath]);

  const handleLogin = async () => {
    Keyboard.dismiss();

    const result = CredentialsSchema.safeParse(credentials);
    if (!result.success) return;

    if (saveAccount) {
      // Show save account modal to choose security type
      setPendingLogin({
        username: credentials.username,
        password: credentials.password,
      });
      setShowSaveModal(true);
    } else {
      // Login without saving
      await performLogin(credentials.username, credentials.password);
    }
  };

  const performLogin = async (
    username: string,
    password: string,
    options?: {
      saveAccount?: boolean;
      securityType?: AccountSecurityType;
      pinCode?: string;
    },
  ) => {
    setLoading(true);
    try {
      await login(username, password, serverName, options);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(t("login.connection_failed"), error.message);
      } else {
        Alert.alert(
          t("login.connection_failed"),
          t("login.an_unexpected_error_occured"),
        );
      }
    } finally {
      setLoading(false);
      setPendingLogin(null);
    }
  };

  const handleSaveAccountConfirm = async (
    securityType: AccountSecurityType,
    pinCode?: string,
  ) => {
    setShowSaveModal(false);
    if (pendingLogin) {
      await performLogin(pendingLogin.username, pendingLogin.password, {
        saveAccount: true,
        securityType,
        pinCode,
      });
    }
  };

  const handleQuickLoginWithSavedCredential = async (
    serverUrl: string,
    userId: string,
  ) => {
    await loginWithSavedCredential(serverUrl, userId);
  };

  const handlePasswordLogin = async (
    serverUrl: string,
    username: string,
    password: string,
  ) => {
    await loginWithPassword(serverUrl, username, password);
  };

  const handleAddAccount = (server: SavedServer) => {
    // Server is already selected, go to credential entry
    (async () => {
      try {
        await setServer({ address: server.address });
        if (server.name) {
          setServerName(server.name);
        }
      } catch (error) {
        Alert.alert(
          t("login.connection_failed"),
          error instanceof Error
            ? error.message
            : t("login.an_unexpected_error_occured"),
        );
      }
    })();
  };

  const confirmInsecureHttpForServer = useCallback((httpUrl: string) => {
    const host = getServerHost(httpUrl) ?? httpUrl;
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finalize = (value: boolean) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      Alert.alert(
        "Allow insecure HTTP?",
        `The server ${host} is only reachable over HTTP. This is less secure and can expose your traffic to interception.\n\nAllow insecure HTTP for this server?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => finalize(false) },
          {
            text: "Allow for this server",
            style: "destructive",
            onPress: () => finalize(true),
          },
        ],
        { cancelable: true, onDismiss: () => finalize(false) },
      );
    });
  }, []);

  const checkServerAtUrl = useCallback(
    async (serverUrl: string) => {
      try {
        const response = await fetch(`${serverUrl}/System/Info/Public`, {
          mode: "cors",
        });
        if (!response.ok) {
          return undefined;
        }

        const data = (await response.json()) as PublicSystemInfo;
        const serverVersion = data.Version?.split(".");
        if (
          serverVersion &&
          +serverVersion[0] <= 10 &&
          +serverVersion[1] < 10
        ) {
          Alert.alert(
            t("login.too_old_server_text"),
            t("login.too_old_server_description"),
          );
          throw new Error("Server too old");
        }

        setServerName(data.ServerName || "");
        return serverUrl;
      } catch (error) {
        if (error instanceof Error && error.message === "Server too old") {
          throw error;
        }
        return undefined;
      }
    },
    [t],
  );

  const resolveServerUrl = useCallback(
    async (rawUrl: string) => {
      setLoadingServerCheck(true);
      try {
        const trimmed = rawUrl.trim().replace(/\/$/, "");
        const hasExplicitProtocol = /^https?:\/\//i.test(trimmed);
        const normalized = normalizeServerUrl(trimmed);
        if (!normalized) {
          return undefined;
        }

        if (hasExplicitProtocol) {
          const explicitUrl = isHttpUrl(normalized)
            ? forceProtocol(normalized, "http")
            : forceProtocol(normalized, "https");

          if (!explicitUrl) {
            return undefined;
          }

          if (
            isHttpUrl(explicitUrl) &&
            !isInsecureHttpAllowedForUrl(explicitUrl)
          ) {
            const approved = await confirmInsecureHttpForServer(explicitUrl);
            if (!approved) {
              return undefined;
            }
            allowInsecureHttpForUrl(explicitUrl);
          }

          return checkServerAtUrl(explicitUrl);
        }

        const httpsUrl = forceProtocol(normalized, "https");
        if (!httpsUrl) {
          return undefined;
        }

        const httpsResult = await checkServerAtUrl(httpsUrl);
        if (httpsResult) {
          return httpsResult;
        }

        const httpUrl = forceProtocol(normalized, "http");
        if (!httpUrl) {
          return undefined;
        }

        const httpResult = await checkServerAtUrl(httpUrl);
        if (!httpResult) {
          return undefined;
        }

        if (isInsecureHttpAllowedForUrl(httpResult)) {
          return httpResult;
        }

        const approved = await confirmInsecureHttpForServer(httpResult);
        if (!approved) {
          return undefined;
        }

        allowInsecureHttpForUrl(httpResult);
        return httpResult;
      } finally {
        setLoadingServerCheck(false);
      }
    },
    [checkServerAtUrl, confirmInsecureHttpForServer],
  );
  /**
   * Handles connection to a Jellyfin server with HTTPS-first resolution.
   * HTTP is only allowed when explicitly approved for the server host.
   */
  const handleConnect = useCallback(
    async (url: string) => {
      try {
        const result = await resolveServerUrl(url);
        if (result === undefined) {
          Alert.alert(
            t("login.connection_failed"),
            t("login.could_not_connect_to_server"),
          );
          return;
        }
        await setServer({ address: result });
      } catch (error) {
        Alert.alert(
          t("login.connection_failed"),
          error instanceof Error
            ? error.message
            : t("login.an_unexpected_error_occured"),
        );
      }
    },
    [resolveServerUrl, setServer],
  );

  const handleQuickConnect = async () => {
    try {
      const code = await initiateQuickConnect();
      if (code) {
        Alert.alert(
          t("login.quick_connect"),
          t("login.enter_code_to_login", { code: code }),
          [
            {
              text: t("login.got_it"),
            },
          ],
        );
      }
    } catch (_error) {
      Alert.alert(
        t("login.error_title"),
        t("login.failed_to_initiate_quick_connect"),
      );
    }
  };

  return Platform.isTV ? (
    // TV layout
    <SafeAreaView className='flex-1 bg-black'>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {api?.basePath ? (
          // ------------ Username/Password view ------------
          <View className='flex-1 items-center justify-center'>
            {/* Safe centered column with max width so TV doesn’t stretch too far */}
            <View className='w-[92%] max-w-[900px] px-2 -mt-12'>
              <Text className='text-3xl font-bold text-white mb-1'>
                {serverName ? (
                  <>
                    {`${t("login.login_to_title")} `}
                    <Text className='text-purple-500'>{serverName}</Text>
                  </>
                ) : (
                  t("login.login_title")
                )}
              </Text>
              <Text className='text-xs text-neutral-400 mb-6'>
                {api.basePath}
              </Text>

              {/* Username */}
              <Input
                placeholder={t("login.username_placeholder")}
                onChangeText={(text: string) =>
                  setCredentials((prev) => ({ ...prev, username: text }))
                }
                onEndEditing={(e) => {
                  const newValue = e.nativeEvent.text;
                  if (newValue && newValue !== credentials.username) {
                    setCredentials((prev) => ({ ...prev, username: newValue }));
                  }
                }}
                value={credentials.username}
                keyboardType='default'
                returnKeyType='done'
                autoCapitalize='none'
                autoCorrect={false}
                textContentType='username'
                clearButtonMode='while-editing'
                maxLength={500}
                extraClassName='mb-4'
                autoFocus={false}
                blurOnSubmit={true}
              />

              {/* Password */}
              <Input
                placeholder={t("login.password_placeholder")}
                onChangeText={(text: string) =>
                  setCredentials((prev) => ({ ...prev, password: text }))
                }
                onEndEditing={(e) => {
                  const newValue = e.nativeEvent.text;
                  if (newValue && newValue !== credentials.password) {
                    setCredentials((prev) => ({ ...prev, password: newValue }));
                  }
                }}
                value={credentials.password}
                secureTextEntry
                keyboardType='default'
                returnKeyType='done'
                autoCapitalize='none'
                textContentType='password'
                clearButtonMode='while-editing'
                maxLength={500}
                extraClassName='mb-4'
                autoFocus={false}
                blurOnSubmit={true}
              />

              <View className='mt-4'>
                <Button
                  onPress={handleLogin}
                  disabled={!credentials.username.trim()}
                >
                  {t("login.login_button")}
                </Button>
              </View>
              <View className='mt-3'>
                <Button
                  onPress={handleQuickConnect}
                  className='bg-neutral-800 border border-neutral-700'
                >
                  {t("login.quick_connect")}
                </Button>
              </View>
            </View>
          </View>
        ) : (
          // ------------ Server connect view ------------
          <View className='flex-1 items-center justify-center'>
            <View className='w-[92%] max-w-[900px] -mt-2'>
              <View className='items-center mb-1'>
                <Image
                  source={require("@/assets/images/icon-ios-plain.png")}
                  style={{ width: 110, height: 110 }}
                  contentFit='contain'
                />
              </View>

              <Text className='text-white text-4xl font-bold text-center'>
                Streamyfin
              </Text>
              <Text className='text-neutral-400 text-base text-left mt-2 mb-1'>
                {t("server.enter_url_to_jellyfin_server")}
              </Text>

              {/* Full-width Input with clear focus ring */}
              <Input
                aria-label='Server URL'
                placeholder={t("server.server_url_placeholder")}
                onChangeText={setServerURL}
                value={serverURL}
                keyboardType='url'
                returnKeyType='done'
                autoCapitalize='none'
                textContentType='URL'
                maxLength={500}
                autoFocus={false}
                blurOnSubmit={true}
              />

              {/* Full-width primary button */}
              <View className='mt-4'>
                <Button
                  onPress={async () => {
                    await handleConnect(serverURL);
                  }}
                >
                  {t("server.connect_button")}
                </Button>
              </View>

              {/* Lists stay full width but inside max width container */}
              <View className='mt-2'>
                <JellyfinServerDiscovery
                  onServerSelect={async (server: any) => {
                    setServerURL(server.address);
                    if (server.serverName) setServerName(server.serverName);
                    await handleConnect(server.address);
                  }}
                />
                <PreviousServersList
                  onServerSelect={async (s) => {
                    await handleConnect(s.address);
                  }}
                  onQuickLogin={handleQuickLoginWithSavedCredential}
                  onPasswordLogin={handlePasswordLogin}
                  onAddAccount={handleAddAccount}
                />
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  ) : (
    // Mobile layout
    <SafeAreaView style={{ flex: 1, paddingBottom: 16 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {api?.basePath ? (
          <View className='flex flex-col flex-1 justify-center'>
            <View className='px-4 w-full'>
              <View className='flex flex-col space-y-2'>
                <Text className='text-2xl font-bold -mb-2'>
                  {serverName ? (
                    <>
                      {`${t("login.login_to_title")} `}
                      <Text className='text-purple-600'>{serverName}</Text>
                    </>
                  ) : (
                    t("login.login_title")
                  )}
                </Text>
                <Text className='text-xs text-neutral-400'>{api.basePath}</Text>
                <Input
                  placeholder={t("login.username_placeholder")}
                  onChangeText={(text) =>
                    setCredentials((prev) => ({ ...prev, username: text }))
                  }
                  onEndEditing={(e) => {
                    const newValue = e.nativeEvent.text;
                    if (newValue && newValue !== credentials.username) {
                      setCredentials((prev) => ({
                        ...prev,
                        username: newValue,
                      }));
                    }
                  }}
                  value={credentials.username}
                  keyboardType='default'
                  returnKeyType='done'
                  autoCapitalize='none'
                  autoCorrect={false}
                  textContentType='username'
                  clearButtonMode='while-editing'
                  maxLength={500}
                />

                <Input
                  placeholder={t("login.password_placeholder")}
                  onChangeText={(text) =>
                    setCredentials((prev) => ({ ...prev, password: text }))
                  }
                  onEndEditing={(e) => {
                    const newValue = e.nativeEvent.text;
                    if (newValue && newValue !== credentials.password) {
                      setCredentials((prev) => ({
                        ...prev,
                        password: newValue,
                      }));
                    }
                  }}
                  value={credentials.password}
                  secureTextEntry
                  keyboardType='default'
                  returnKeyType='done'
                  autoCapitalize='none'
                  textContentType='password'
                  clearButtonMode='while-editing'
                  maxLength={500}
                />
                <TouchableOpacity
                  onPress={() => setSaveAccount(!saveAccount)}
                  className='flex flex-row items-center py-2'
                  activeOpacity={0.7}
                >
                  <Switch
                    value={saveAccount}
                    onValueChange={setSaveAccount}
                    trackColor={{ false: "#3f3f46", true: Colors.primary }}
                    thumbColor='white'
                  />
                  <Text className='ml-3 text-neutral-300'>
                    {t("save_account.save_for_later")}
                  </Text>
                </TouchableOpacity>
                <View className='flex flex-row items-center justify-between'>
                  <Button
                    onPress={handleLogin}
                    loading={loading}
                    disabled={!credentials.username.trim()}
                    className='flex-1 mr-2'
                  >
                    {t("login.login_button")}
                  </Button>
                  <TouchableOpacity
                    onPress={handleQuickConnect}
                    className='p-2 bg-neutral-900 rounded-xl h-12 w-12 flex items-center justify-center'
                  >
                    <MaterialCommunityIcons
                      name='cellphone-lock'
                      size={24}
                      color='white'
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View className='absolute bottom-0 left-0 w-full px-4 mb-2' />
          </View>
        ) : (
          <View className='flex flex-col flex-1 items-center justify-center w-full'>
            <View className='flex flex-col gap-y-2 px-4 w-full -mt-36'>
              <Image
                style={{
                  width: 100,
                  height: 100,
                  marginLeft: -23,
                  marginBottom: -20,
                }}
                source={require("@/assets/images/icon-ios-plain.png")}
              />
              <Text className='text-3xl font-bold'>Streamyfin</Text>
              <Text className='text-neutral-500'>
                {t("server.enter_url_to_jellyfin_server")}
              </Text>
              <Input
                aria-label='Server URL'
                placeholder={t("server.server_url_placeholder")}
                onChangeText={setServerURL}
                value={serverURL}
                keyboardType='url'
                returnKeyType='done'
                autoCapitalize='none'
                textContentType='URL'
                maxLength={500}
              />
              <Button
                loading={loadingServerCheck}
                disabled={loadingServerCheck}
                onPress={async () => {
                  await handleConnect(serverURL);
                }}
                className='w-full grow'
              >
                {t("server.connect_button")}
              </Button>
              <JellyfinServerDiscovery
                onServerSelect={async (server) => {
                  setServerURL(server.address);
                  if (server.serverName) {
                    setServerName(server.serverName);
                  }
                  await handleConnect(server.address);
                }}
              />
              <PreviousServersList
                onServerSelect={async (s) => {
                  await handleConnect(s.address);
                }}
                onQuickLogin={handleQuickLoginWithSavedCredential}
                onPasswordLogin={handlePasswordLogin}
                onAddAccount={handleAddAccount}
              />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Save Account Modal */}
      <SaveAccountModal
        visible={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setPendingLogin(null);
        }}
        onSave={handleSaveAccountConfirm}
        username={pendingLogin?.username || credentials.username}
      />
    </SafeAreaView>
  );
};

export default Login;
