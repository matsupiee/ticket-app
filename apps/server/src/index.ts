import { serve } from "@hono/node-server"; // Cloud Run を使う場合、このパッケージが必要
import { disconnectDb } from "@ticket-app/db";
import { env } from "@ticket-app/env/server";

import app from "./app";

function parsePort(port: string) {
  const parsed = Number.parseInt(port, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT: ${port}`);
  }

  return parsed;
}
const port = parsePort(env.PORT ?? "3000");

let isServerListening = false;
const server = serve(
  {
    fetch: app.fetch,
    hostname: "0.0.0.0", // 0.0.0.0にすることで、Cloud Runのコンテナ外部からアクセス可能になる
    port,
  },
  (info) => {
    isServerListening = true;
    console.info(`API server listening on http://0.0.0.0:${info.port}`);
  },
);

// Cloud Run インスタンスの終了シグナルを監視して、シャットダウンを行う
// Cloud Run がインスタンスを終了するときは、基本的に SIGTERM が送られてくる
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}

async function shutdown(signal: NodeJS.Signals) {
  console.info(`Received ${signal}. Closing API server.`);

  let exitCode = 0;

  if (isServerListening) {
    try {
      await new Promise<void>((resolve, reject) => {
        // 8秒経って成功しなければエラーをスローする
        const timeoutId = setTimeout(() => {
          reject(new Error("API server close timed out."));
        }, 8_000);

        server.close((error) => {
          clearTimeout(timeoutId);

          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    } catch (error) {
      console.error(error);
      exitCode = 1;
    }
  }

  try {
    await disconnectDb();
  } catch (error) {
    console.error(error);
    exitCode = 1;
  }

  process.exit(exitCode);
}
