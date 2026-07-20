import { db } from "@ticket-app/db";
import { env } from "@ticket-app/env/server";
import { betterAuth, type SecondaryStorage } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { parseTrustedOrigins } from "./origins";

const globalForLocalAuthStorage = globalThis as typeof globalThis & {
  __ticketAppLocalAuthStorage?: Map<string, { value: string; expiresAt?: number }>;
};

const localAuthStorage =
  globalForLocalAuthStorage.__ticketAppLocalAuthStorage ??
  new Map<string, { value: string; expiresAt?: number }>();

globalForLocalAuthStorage.__ticketAppLocalAuthStorage = localAuthStorage;

export function createAuth() {
  const trustedOrigins = parseTrustedOrigins(env.CORS_ORIGIN);
  const useLocalSessionStorage = trustedOrigins.some(isLocalDevelopmentOrigin);

  return betterAuth({
    database: prismaAdapter(db, {
      provider: "postgresql",
    }),
    secondaryStorage: useLocalSessionStorage ? createLocalAuthStorage() : undefined,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        console.info(`Password reset URL for ${user.email}: ${url}`);
      },
    },
    session: useLocalSessionStorage
      ? {
          cookieCache: {
            enabled: true,
            maxAge: 60 * 60,
          },
        }
      : undefined,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
      // Enable this when the API and frontends share a parent production domain.
      // crossSubDomainCookies: {
      //   enabled: true,
      //   domain: "<your-domain>",
      // },
    },
  });
}

function isLocalDevelopmentOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function createLocalAuthStorage(): SecondaryStorage {
  const read = (key: string) => {
    const item = localAuthStorage.get(key);

    if (!item) {
      return null;
    }

    if (item.expiresAt !== undefined && item.expiresAt <= Date.now()) {
      localAuthStorage.delete(key);
      return null;
    }

    return item.value;
  };

  return {
    get: read,
    getAndDelete: (key) => {
      const value = read(key);
      localAuthStorage.delete(key);
      return value;
    },
    increment: (key, ttl) => {
      const current = Number.parseInt(read(key) ?? "0", 10);
      const next = Number.isFinite(current) ? current + 1 : 1;
      localAuthStorage.set(key, {
        value: String(next),
        expiresAt: Date.now() + ttl * 1000,
      });
      return next;
    },
    set: (key, value, ttl) => {
      localAuthStorage.set(key, {
        value,
        expiresAt: ttl === undefined ? undefined : Date.now() + ttl * 1000,
      });
    },
    delete: (key) => {
      localAuthStorage.delete(key);
    },
  };
}
