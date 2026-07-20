declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL?: string;
      DIRECT_URL?: string;
      CORS_ORIGIN?: string;
      BETTER_AUTH_SECRET?: string;
      BETTER_AUTH_URL?: string;
      PORT?: string;
    }
  }
}

export {};
