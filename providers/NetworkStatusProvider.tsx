import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiAtom } from "@/providers/JellyfinProvider";

interface NetworkStatusContextType {
  isConnected: boolean;
  serverConnected: boolean | null;
  loading: boolean;
  retryCheck: () => Promise<void>;
}

const NetworkStatusContext = createContext<NetworkStatusContextType | null>(
  null,
);

const SERVER_CHECK_TIMEOUT_MS = 4000;
const SERVER_CHECK_RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkApiReachable(basePath?: string): Promise<boolean> {
  if (!basePath) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    SERVER_CHECK_TIMEOUT_MS,
  );

  try {
    const normalizedBasePath = basePath.endsWith("/")
      ? basePath
      : `${basePath}/`;
    // Ping endpoint is more reliable than HEAD / for reverse proxies.
    const pingUrl = `${normalizedBasePath}System/Ping`;
    const response = await fetch(pingUrl, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    // Any non-5xx response means server is reachable.
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [api] = useAtom(apiAtom);
  const queryClient = useQueryClient();
  const wasServerConnected = useRef<boolean | null>(null);
  const validationRequestId = useRef(0);

  const validateConnection = useCallback(async () => {
    if (!api?.basePath) {
      setServerConnected(false);
      return false;
    }

    const requestId = ++validationRequestId.current;
    setServerConnected((prev) => (prev === true ? prev : null));

    let reachable = await checkApiReachable(api.basePath);
    if (!reachable) {
      await sleep(SERVER_CHECK_RETRY_DELAY_MS);
      // Ignore stale checks if a newer check started.
      if (requestId !== validationRequestId.current) return false;
      reachable = await checkApiReachable(api.basePath);
    }

    if (requestId === validationRequestId.current) {
      setServerConnected(reachable);
    }
    return reachable;
  }, [api?.basePath]);

  const retryCheck = useCallback(async () => {
    setLoading(true);
    await validateConnection();
    setLoading(false);
  }, [validateConnection]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const connected = !!state.isConnected;
      setIsConnected(connected);
      if (connected && api?.basePath) {
        await validateConnection();
      } else {
        setServerConnected(false);
      }
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      const connected = !!state.isConnected;
      setIsConnected(connected);
      if (connected && api?.basePath) {
        void validateConnection();
      } else {
        setServerConnected(false);
      }
    });

    return () => unsubscribe();
  }, [api?.basePath, validateConnection]);

  useEffect(() => {
    if (isConnected && api?.basePath) {
      void validateConnection();
    } else {
      setServerConnected(false);
    }
  }, [api?.basePath, isConnected, validateConnection]);

  // Refetch active queries when server becomes reachable
  useEffect(() => {
    if (serverConnected && wasServerConnected.current === false) {
      queryClient.refetchQueries({ type: "active" });
    }
    wasServerConnected.current = serverConnected;
  }, [serverConnected, queryClient]);

  return (
    <NetworkStatusContext.Provider
      value={{ isConnected, serverConnected, loading, retryCheck }}
    >
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus(): NetworkStatusContextType {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error(
      "useNetworkStatus must be used within NetworkStatusProvider",
    );
  }
  return context;
}
