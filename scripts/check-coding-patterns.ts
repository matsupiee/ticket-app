import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export type CheckIssue = {
  path: string;
  rule: string;
  message: string;
};

type ProjectSnapshot = {
  files: string[];
  directories?: string[];
};

const backendRoutersRoot = "packages/api/src/routers";
const backendLegacyHandlersRoot = "packages/api/src/handlers";
const backendAllowedRouterRoots = new Set(["fan", "organizer", "platform"]);
const backendAllowedRouterIndexFiles = new Set([
  `${backendRoutersRoot}/index.ts`,
  ...[...backendAllowedRouterRoots].map(
    (routerRoot) => `${backendRoutersRoot}/${routerRoot}/index.ts`,
  ),
]);
const backendRequiredRouteDirectoryFiles = [
  "route.ts",
  "handler.ts",
  "handler.integration.test.ts",
];
const backendAllowedRouteDirectoryFiles = new Set(backendRequiredRouteDirectoryFiles);

const frontendAllowedSrcDirs = new Set(["features", "shared", "lib", "routes", "test"]);
const frontendAllowedSharedDirs = new Set(["_components", "_hooks", "_utils"]);
const frontendLayerDirReplacements = new Map([
  ["components", "_components"],
  ["hooks", "_hooks"],
  ["utils", "_utils"],
  ["schemas", "_utils"],
]);

const ignoredDirectoryNames = new Set([
  ".git",
  ".tanstack",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
  "test-results",
]);

const fileNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fileNameSuffixes = [
  ".integration.test.tsx",
  ".integration.test.ts",
  ".unit.test.tsx",
  ".unit.test.ts",
  ".test.tsx",
  ".test.ts",
  ".spec.tsx",
  ".spec.ts",
  ".d.ts",
  ".tsx",
  ".ts",
  ".css",
];

export function checkCodingPatterns(snapshot: ProjectSnapshot): CheckIssue[] {
  const files = uniqueSorted(snapshot.files.map(normalizeProjectPath));
  const directories = uniqueSorted([
    ...(snapshot.directories ?? []).map(normalizeProjectPath),
    ...deriveDirectories(files),
  ]);

  return sortIssues([
    ...checkBackendPatterns(files, directories),
    ...checkFrontendPatterns(files, directories),
    ...checkFileNamePatterns(files),
  ]);
}

export function collectProjectFiles(cwd = process.cwd()): string[] {
  try {
    const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    return output
      .split(/\r?\n/)
      .map(normalizeProjectPath)
      .filter(Boolean)
      .filter((file) => isExistingFile(join(cwd, file)));
  } catch {
    return collectFilesFromFileSystem(cwd, cwd);
  }
}

export function formatIssues(issues: CheckIssue[]) {
  if (issues.length === 0) {
    return "docs/coding-pattern directory/file rules: OK";
  }

  return [
    "docs/coding-pattern のディレクトリ/ファイル名規約違反が見つかりました。",
    "",
    ...issues.map((issue) => `- ${issue.path}\n  ${issue.rule}: ${issue.message}`),
  ].join("\n");
}

export function runCli(cwd = process.cwd()) {
  const issues = checkCodingPatterns({
    files: collectProjectFiles(cwd),
  });

  if (issues.length > 0) {
    console.error(formatIssues(issues));
    return 1;
  }

  console.log(formatIssues(issues));
  return 0;
}

function checkBackendPatterns(files: string[], directories: string[]): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const existingFiles = new Set(files);
  const routerFiles = files.filter((file) => file.startsWith(`${backendRoutersRoot}/`));

  if (routerFiles.length === 0) {
    return issues;
  }

  addIssueIfMissing(
    issues,
    existingFiles,
    `${backendRoutersRoot}/index.ts`,
    "backend routers",
    "routers/index.ts を置いて全ルートを集約してください。",
  );
  for (const routerRoot of backendAllowedRouterRoots) {
    addIssueIfMissing(
      issues,
      existingFiles,
      `${backendRoutersRoot}/${routerRoot}/index.ts`,
      "backend routers",
      `${routerRoot}/index.ts を置いてユーザー種別ごとのルートを集約してください。`,
    );
  }

  for (const directory of directories) {
    if (parentPath(directory) !== backendRoutersRoot) {
      continue;
    }

    const name = basename(directory);
    if (!backendAllowedRouterRoots.has(name)) {
      issues.push({
        path: directory,
        rule: "backend routers",
        message: "routers 直下のルート種別は fan / organizer / platform に分離してください。",
      });
    }
  }

  const routeFileNamesByDirectory = new Map<string, Set<string>>();

  for (const file of routerFiles) {
    const relativePath = file.slice(`${backendRoutersRoot}/`.length);
    const parts = relativePath.split("/");
    const fileName = basename(file);

    if (parts.length === 1 && fileName !== "index.ts") {
      issues.push({
        path: file,
        rule: "backend route file",
        message: "routers 直下に API 実装ファイルを置かず、ユーザー種別配下へ置いてください。",
      });
    }

    if (parts.length > 1 && !backendAllowedRouterRoots.has(parts[0])) {
      issues.push({
        path: file,
        rule: "backend route root",
        message: "API ルートは fan / organizer / platform のいずれかの配下に置いてください。",
      });
    }

    if (fileName === "index.ts") {
      if (!backendAllowedRouterIndexFiles.has(file)) {
        issues.push({
          path: file,
          rule: "backend route index",
          message:
            "index.ts は packages/api/src/routers/index.ts と packages/api/src/routers/{fan|organizer|platform}/index.ts だけに置いてください。",
        });
      }

      continue;
    }

    if (!backendAllowedRouteDirectoryFiles.has(fileName)) {
      issues.push({
        path: file,
        rule: "backend route file",
        message:
          "各 API ルートディレクトリには route.ts / handler.ts / handler.integration.test.ts だけを置いてください。",
      });
    }

    if (backendAllowedRouteDirectoryFiles.has(fileName)) {
      const routeDirectory = parentPath(file);
      const filesInRouteDirectory = routeFileNamesByDirectory.get(routeDirectory) ?? new Set();
      filesInRouteDirectory.add(fileName);
      routeFileNamesByDirectory.set(routeDirectory, filesInRouteDirectory);

      const routeDirectoryParts = routeDirectory.slice(`${backendRoutersRoot}/`.length).split("/");
      if (routeDirectoryParts.length < 2) {
        issues.push({
          path: file,
          rule: "backend route directory",
          message:
            "1 API ルートごとに専用ディレクトリを作り、その中へ route.ts / handler.ts / handler.integration.test.ts を置いてください。",
        });
      }
    }
  }

  for (const file of files) {
    if (!file.startsWith(`${backendLegacyHandlersRoot}/`)) {
      continue;
    }

    issues.push({
      path: file,
      rule: "backend legacy handlers",
      message:
        "handler.ts は各 API ルートディレクトリへ置き、packages/api/src/handlers 配下に残さないでください。",
    });
  }

  for (const [routeDirectory, routeFiles] of routeFileNamesByDirectory) {
    for (const requiredFile of backendRequiredRouteDirectoryFiles) {
      if (routeFiles.has(requiredFile)) {
        continue;
      }

      issues.push({
        path: `${routeDirectory}/${requiredFile}`,
        rule: "backend route files",
        message:
          "各 API ルートディレクトリには route.ts / handler.ts / handler.integration.test.ts の3ファイルを置いてください。",
      });
    }
  }

  return dedupeIssues(issues);
}

function checkFileNamePatterns(files: string[]): CheckIssue[] {
  const issues: CheckIssue[] = [];

  for (const file of files) {
    if (!shouldCheckFileName(file) || hasKebabCaseFileName(file)) {
      continue;
    }

    issues.push({
      path: file,
      rule: "file naming",
      message:
        "実装ファイル名は kebab-case にしてください。例: event-card.tsx / event-card.unit.test.ts",
    });
  }

  return issues;
}

function shouldCheckFileName(file: string) {
  if (!isSourceFile(file)) {
    return false;
  }

  if (
    file.includes("/generated/") ||
    /^apps\/[^/]+\/src\/routes\//.test(file) ||
    /^apps\/[^/]+\/src\/routeTree\.gen\.ts$/.test(file)
  ) {
    return false;
  }

  return (
    /^apps\/[^/]+\/src\//.test(file) ||
    /^packages\/[^/]+\/src\//.test(file) ||
    /^scripts\/.+/.test(file)
  );
}

function hasKebabCaseFileName(file: string) {
  return fileNamePattern.test(stripKnownFileSuffixes(basename(file)));
}

function stripKnownFileSuffixes(fileName: string) {
  const suffix = fileNameSuffixes.find((fileSuffix) => fileName.endsWith(fileSuffix));
  return suffix ? fileName.slice(0, -suffix.length) : fileName;
}

function checkFrontendPatterns(files: string[], directories: string[]): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const frontendSrcRoots = findFrontendSrcRoots(files, directories);

  for (const srcRoot of frontendSrcRoots) {
    for (const directory of directories) {
      if (parentPath(directory) !== srcRoot) {
        continue;
      }

      const name = basename(directory);
      if (!frontendAllowedSrcDirs.has(name)) {
        issues.push({
          path: directory,
          rule: "frontend src directory",
          message:
            "src 直下の機能コードは features / shared / lib に寄せ、routes と test 以外へ分散させないでください。",
        });
      }
    }

    const sharedRoot = `${srcRoot}/shared`;
    for (const directory of directories) {
      if (parentPath(directory) !== sharedRoot) {
        continue;
      }

      const name = basename(directory);
      if (!frontendAllowedSharedDirs.has(name)) {
        issues.push({
          path: directory,
          rule: "frontend shared directory",
          message: "shared 配下は _components / _hooks / _utils に分類してください。",
        });
      }
    }

    for (const file of files) {
      if (parentPath(file) !== sharedRoot || basename(file) === "index.ts") {
        continue;
      }

      issues.push({
        path: file,
        rule: "frontend shared file",
        message:
          "shared 直下に実装ファイルを置かず、_components / _hooks / _utils 配下へ置いてください。",
      });
    }

    for (const directory of directories) {
      if (
        !directory.startsWith(`${srcRoot}/features/`) &&
        !directory.startsWith(`${srcRoot}/shared/`)
      ) {
        continue;
      }

      const name = basename(directory);
      const expectedName = frontendLayerDirReplacements.get(name);
      if (!expectedName) {
        continue;
      }

      issues.push({
        path: directory,
        rule: "frontend layer directory",
        message: `${name} ではなく ${expectedName} を使ってください。`,
      });
    }
  }

  return dedupeIssues(issues);
}

function findFrontendSrcRoots(files: string[], directories: string[]) {
  const roots = new Set<string>();

  for (const path of [...files, ...directories]) {
    const match = /^apps\/([^/]+)\/src(?:\/|$)/.exec(path);
    if (!match || match[1] === "server") {
      continue;
    }

    roots.add(`apps/${match[1]}/src`);
  }

  return [...roots].sort();
}

function addIssueIfMissing(
  issues: CheckIssue[],
  files: Set<string>,
  path: string,
  rule: string,
  message: string,
) {
  if (files.has(path)) {
    return;
  }

  issues.push({
    path,
    rule,
    message,
  });
}

function collectFilesFromFileSystem(directory: string, cwd: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) {
      continue;
    }

    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFilesFromFileSystem(absolutePath, cwd));
      continue;
    }

    if (entry.isFile()) {
      files.push(normalizeProjectPath(relative(cwd, absolutePath)));
    }
  }

  return files;
}

function deriveDirectories(files: string[]) {
  const directories = new Set<string>();

  for (const file of files) {
    const parts = file.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(parts.slice(0, index).join("/"));
    }
  }

  return [...directories];
}

function isExistingFile(path: string) {
  return existsSync(path) && statSync(path).isFile();
}

function isSourceFile(path: string) {
  return path.endsWith(".ts") || path.endsWith(".tsx") || path.endsWith(".css");
}

function basename(path: string) {
  return path.split("/").at(-1) ?? path;
}

function parentPath(path: string) {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function normalizeProjectPath(path: string) {
  return path
    .split(sep)
    .join("/")
    .replace(/^\.\/+/, "")
    .replace(/\/+$/, "");
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function dedupeIssues(issues: CheckIssue[]) {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    const key = `${issue.rule}\0${issue.path}\0${issue.message}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sortIssues(issues: CheckIssue[]) {
  return dedupeIssues(issues).sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.rule.localeCompare(right.rule) ||
      left.message.localeCompare(right.message),
  );
}

function isDirectRun() {
  const scriptPath = process.argv[1];
  return !!scriptPath && resolve(scriptPath) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  process.exitCode = runCli();
}
