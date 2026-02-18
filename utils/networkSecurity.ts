import { storage } from "@/utils/mmkv";

const INSECURE_HTTP_ALLOWED_HOSTS_KEY = "insecureHttpAllowedHosts";

const SENSITIVE_QUERY_PARAMS = new Set([
  "api_key",
  "access_token",
  "token",
  "authorization",
  "auth",
]);

const isHttpProtocol = (protocol: string): boolean =>
  protocol === "http:" || protocol === "https:";

const ensureHttpScheme = (url: string): string =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`;

const normalizeTrailingSlash = (url: string): string =>
  url.endsWith("/") ? url.slice(0, -1) : url;

export function normalizeServerUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(ensureHttpScheme(trimmed));
    if (!isHttpProtocol(parsed.protocol)) {
      return null;
    }

    parsed.hash = "";
    return normalizeTrailingSlash(parsed.toString());
  } catch {
    return null;
  }
}

export function getServerHost(rawUrl: string): string | null {
  const normalized = normalizeServerUrl(rawUrl);
  if (!normalized) return null;

  try {
    return new URL(normalized).host.toLowerCase();
  } catch {
    return null;
  }
}

export function forceProtocol(rawUrl: string, protocol: "http" | "https") {
  const normalized = normalizeServerUrl(rawUrl);
  if (!normalized) return null;

  const parsed = new URL(normalized);
  parsed.protocol = `${protocol}:`;
  return normalizeTrailingSlash(parsed.toString());
}

export function isHttpUrl(rawUrl: string): boolean {
  const normalized = normalizeServerUrl(rawUrl);
  if (!normalized) return false;

  try {
    return new URL(normalized).protocol === "http:";
  } catch {
    return false;
  }
}

function getInsecureHttpAllowedHosts(): string[] {
  const rawHosts = storage.getString(INSECURE_HTTP_ALLOWED_HOSTS_KEY);
  if (!rawHosts) return [];

  try {
    const parsed = JSON.parse(rawHosts);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => (typeof value === "string" ? value.toLowerCase() : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function saveInsecureHttpAllowedHosts(hosts: string[]) {
  const uniqueHosts = Array.from(
    new Set(hosts.map((host) => host.toLowerCase())),
  );
  storage.set(INSECURE_HTTP_ALLOWED_HOSTS_KEY, JSON.stringify(uniqueHosts));
}

export function isInsecureHttpAllowedForHost(host: string | null): boolean {
  if (!host) return false;
  return getInsecureHttpAllowedHosts().includes(host.toLowerCase());
}

export function isInsecureHttpAllowedForUrl(rawUrl: string): boolean {
  const host = getServerHost(rawUrl);
  return isInsecureHttpAllowedForHost(host);
}

export function setInsecureHttpAllowedForHost(host: string, allowed: boolean) {
  const normalizedHost = host.toLowerCase();
  const hosts = getInsecureHttpAllowedHosts();

  if (allowed) {
    if (!hosts.includes(normalizedHost)) {
      hosts.push(normalizedHost);
    }
    saveInsecureHttpAllowedHosts(hosts);
    return;
  }

  saveInsecureHttpAllowedHosts(
    hosts.filter((value) => value !== normalizedHost),
  );
}

export function allowInsecureHttpForUrl(rawUrl: string) {
  const host = getServerHost(rawUrl);
  if (!host) return;
  setInsecureHttpAllowedForHost(host, true);
}

export function stripSensitiveQueryParams(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString();
  } catch {
    return rawUrl
      .replace(
        /([?&](api_key|access_token|token|authorization|auth)=)[^&]*/gi,
        "$1[REDACTED]",
      )
      .replace(/[?&]$/, "");
  }
}

export function getSafeUrlForLogs(rawUrl: string): string {
  try {
    const parsed = new URL(stripSensitiveQueryParams(rawUrl));
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return stripSensitiveQueryParams(rawUrl);
  }
}
