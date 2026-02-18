import { useQuery } from "@tanstack/react-query";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type React from "react";
import { createContext, useContext } from "react";
import { storage } from "./mmkv";

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

const MAX_SANITIZE_DEPTH = 4;
const SENSITIVE_KEY_PATTERN =
  /(token|password|authorization|cookie|secret|api[_-]?key|session)/i;

const sanitizeString = (input: string): string =>
  input
    .replace(
      /([?&](api_key|access_token|token|authorization|auth)=)[^&]*/gi,
      "$1[REDACTED]",
    )
    .replace(/(bearer\s+)[a-z0-9\-_.=]+/gi, "$1[REDACTED]")
    .replace(/(token"?\s*[:=]\s*")([^"]+)/gi, "$1[REDACTED]");

const sanitizeLogData = (value: any, depth = 0): any => {
  if (value == null || depth > MAX_SANITIZE_DEPTH) return value;

  if (typeof value === "string") return sanitizeString(value);
  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogData(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, itemValue] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }
    sanitized[key] = sanitizeLogData(itemValue, depth + 1);
  }
  return sanitized;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (key: string) => storage.getString(key) || null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.remove(key),
}));
const logsAtom = atomWithStorage("logs", [], mmkvStorage);

const LogContext = createContext<ReturnType<typeof useLogProvider> | null>(
  null,
);
const _DownloadContext = createContext<ReturnType<
  typeof useLogProvider
> | null>(null);

function useLogProvider() {
  const { data: logs } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => readFromLog(),
    refetchInterval: 1000,
  });

  return {
    logs,
  };
}

export const writeToLog = (level: LogLevel, message: string, data?: any) => {
  const sanitizedMessage = sanitizeString(message);
  const sanitizedData = sanitizeLogData(data);
  const newEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: level,
    message: sanitizedMessage,
    data: sanitizedData,
  };

  const currentLogs = storage.getString("logs");
  const logs: LogEntry[] = currentLogs ? JSON.parse(currentLogs) : [];
  logs.push(newEntry);

  const maxLogs = 100;
  const recentLogs = logs.slice(Math.max(logs.length - maxLogs, 0));

  storage.set("logs", JSON.stringify(recentLogs));
};

export const writeInfoLog = (message: string, data?: any) =>
  writeToLog("INFO", message, data);
export const writeErrorLog = (message: string, data?: any) =>
  writeToLog("ERROR", message, data);
export const writeDebugLog = (message: string, data?: any) => {
  if (process.env.EXPO_PUBLIC_WRITE_DEBUG === "1") {
    writeToLog("DEBUG", message, data);
  }
};

export const readFromLog = (): LogEntry[] => {
  const logs = storage.getString("logs");
  return logs ? JSON.parse(logs) : [];
};

export const clearLogs = () => {
  storage.remove("logs");
};

export const dumpDownloadDiagnostics = (extra: any = {}) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    processes: extra?.processes || [],
    nativeTasks: extra?.nativeTasks || [],
    focusedProcess: extra?.focusedProcess || null,
  };
  writeDebugLog("Download diagnostics", diagnostics);
  return diagnostics;
};

export function useLog() {
  const context = useContext(LogContext);
  if (context === null) {
    throw new Error("useLog must be used within a LogProvider");
  }
  return context;
}

export function LogProvider({ children }: { children: React.ReactNode }) {
  const provider = useLogProvider();

  return <LogContext.Provider value={provider}>{children}</LogContext.Provider>;
}

export default logsAtom;
