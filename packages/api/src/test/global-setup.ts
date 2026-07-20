import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

export type ApiIntegrationContext = {
  databaseUrl: string;
  origin: string;
  serverUrl: string;
};

declare module "vitest" {
  export interface ProvidedContext {
    apiIntegration: ApiIntegrationContext;
  }
}

const fileDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(fileDir, "../../../..");
const dbRoot = resolve(repoRoot, "packages/db");
const serverRoot = resolve(repoRoot, "apps/server");
const origin = "http://localhost:3002";
const databaseName = "ticket_app_api_int";
const databaseUser = "postgres";
const databasePassword = "postgres";

let serverProcess: ChildProcessWithoutNullStreams | null = null;
let serverOutput = "";
let postgresContainerName: string | null = null;

type GlobalSetupProject = {
  provide: (key: "apiIntegration", value: ApiIntegrationContext) => void;
};

export async function setup(project: GlobalSetupProject) {
  const port = await findOpenPort();
  const serverUrl = `http://localhost:${port}`;
  const externalDatabaseUrl = process.env.API_INTEGRATION_DATABASE_URL;
  const databaseUrl = externalDatabaseUrl ?? buildDatabaseUrl(String(await findOpenPort()));

  postgresContainerName = externalDatabaseUrl
    ? null
    : `ticket-app-api-int-${process.pid}-${Date.now()}`;

  const serverEnv = {
    ...process.env,
    BETTER_AUTH_SECRET: "api-integration-test-secret",
    BETTER_AUTH_URL: serverUrl,
    CORS_ORIGIN: "http://localhost:3001",
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
  };
  Object.assign(process.env, serverEnv);

  try {
    if (postgresContainerName) {
      const databasePort = new URL(databaseUrl).port;
      startPostgresContainer(postgresContainerName, databasePort);
      await waitForPostgres(postgresContainerName);
    }

    execFileSync("bun", ["prisma", "db", "push"], {
      cwd: dbRoot,
      env: serverEnv,
      stdio: "pipe",
    });
    execFileSync("bun", ["run", "build"], {
      cwd: serverRoot,
      env: serverEnv,
      stdio: "pipe",
    });

    serverProcess = spawn("node", ["apps/server/dist/index.mjs"], {
      cwd: repoRoot,
      env: {
        ...serverEnv,
        PORT: String(port),
      },
    });
    serverProcess.stdout.on("data", appendServerOutput);
    serverProcess.stderr.on("data", appendServerOutput);

    await waitForServer(serverUrl);

    project.provide("apiIntegration", {
      databaseUrl,
      origin,
      serverUrl,
    });
  } catch (error) {
    await teardownIntegrationEnvironment();
    throw error;
  }

  return teardownIntegrationEnvironment;
}

async function teardownIntegrationEnvironment() {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    await Promise.race([waitForExit(serverProcess), delay(5_000)]);

    if (serverProcess.exitCode === null) {
      serverProcess.kill("SIGKILL");
    }
  }

  if (postgresContainerName) {
    stopPostgresContainer(postgresContainerName);
  }

  serverProcess = null;
  serverOutput = "";
  postgresContainerName = null;
}

async function waitForServer(url: string) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    if (serverProcess?.exitCode !== null) {
      throw new Error(
        `API server exited before becoming ready: ${serverProcess?.exitCode}\n${serverOutput}`,
      );
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // The API server is still starting.
    }

    await delay(500);
  }

  throw new Error(`API server did not become ready.\n${serverOutput}`);
}

async function findOpenPort() {
  const server = createServer();

  return await new Promise<number>((resolvePort, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Failed to allocate a port."));
        return;
      }

      server.close(() => resolvePort(address.port));
    });
  });
}

function buildDatabaseUrl(port: string) {
  return `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${port}/${databaseName}`;
}

function startPostgresContainer(containerName: string, port: string) {
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--detach",
      "--name",
      containerName,
      "-e",
      `POSTGRES_DB=${databaseName}`,
      "-e",
      `POSTGRES_PASSWORD=${databasePassword}`,
      "-p",
      `127.0.0.1:${port}:5432`,
      process.env.API_INTEGRATION_POSTGRES_IMAGE ?? "postgres:17-alpine",
    ],
    {
      stdio: "pipe",
    },
  );
}

async function waitForPostgres(containerName: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      execFileSync(
        "docker",
        ["exec", containerName, "pg_isready", "-U", databaseUser, "-d", databaseName],
        {
          stdio: "pipe",
        },
      );
      return;
    } catch {
      await delay(500);
    }
  }

  throw new Error("PostgreSQL test container did not become ready.");
}

function stopPostgresContainer(containerName: string) {
  try {
    execFileSync("docker", ["rm", "--force", containerName], {
      stdio: "pipe",
    });
  } catch {
    // The container may already be gone if setup failed.
  }
}

async function waitForExit(process: ChildProcessWithoutNullStreams) {
  await new Promise<void>((resolveExit) => {
    process.once("exit", () => resolveExit());
  });
}

function appendServerOutput(chunk: Buffer) {
  serverOutput = `${serverOutput}${chunk.toString()}`.slice(-8_000);
}
