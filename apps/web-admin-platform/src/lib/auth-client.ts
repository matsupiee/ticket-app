import { createAuthClient } from "better-auth/react";

function getServerUrl(url: string) {
  const normalized = url.endsWith("/") ? url.slice(0, -1) : url;

  if (!normalized.startsWith("/")) {
    return normalized;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }

  return `http://localhost:3000${normalized}`;
}

function getConfiguredServerUrl() {
  const serverUrl = import.meta.env.VITE_SERVER_URL;

  return typeof serverUrl === "string" && serverUrl.length > 0
    ? serverUrl
    : "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: new URL("/api/auth", getServerUrl(getConfiguredServerUrl())).toString(),
});
