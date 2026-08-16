import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouterClient } from "@ticket-app/api/routers/index";

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

const link = new RPCLink({
  url: `${getServerUrl(getConfiguredServerUrl())}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
});

export const client: AppRouterClient = createORPCClient(link);
