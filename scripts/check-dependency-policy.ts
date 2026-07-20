import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

export type DependencyPolicyIssue = {
  path: string;
  line?: number;
  rule: string;
  message: string;
};

type SourceFileSnapshot = {
  path: string;
  source: string;
};

const packageDependencySections = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

const forbiddenDirectDependencies = new Set(["pg", "@types/pg", "postgres"]);
const forbiddenSourceModules = new Set(["pg", "postgres", "@ticket-app/db/postgres"]);
const forbiddenPrismaRawMethods = new Set([
  "$executeRaw",
  "$executeRawUnsafe",
  "$queryRaw",
  "$queryRawTyped",
  "$queryRawUnsafe",
]);

const ignoredPathParts = new Set([
  ".git",
  ".turbo",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
]);

export function checkDependencyPolicy(files: SourceFileSnapshot[]) {
  return [...checkPackageManifests(files), ...checkSourceImports(files)].sort((left, right) => {
    const pathCompare = left.path.localeCompare(right.path);
    if (pathCompare !== 0) {
      return pathCompare;
    }

    return (left.line ?? 0) - (right.line ?? 0);
  });
}

export function collectDependencyPolicyFiles(cwd = process.cwd()) {
  return collectProjectFiles(cwd)
    .filter((path) => !shouldIgnoreProjectPath(path))
    .filter((path) => path.endsWith("package.json") || isSourceFile(path))
    .map((path) => ({
      path,
      source: readFileSync(join(cwd, path), "utf8"),
    }));
}

export function formatDependencyPolicyIssues(issues: DependencyPolicyIssue[]) {
  if (issues.length === 0) {
    return "Dependency policy check: OK";
  }

  return [
    "依存ポリシー違反が見つかりました。",
    "",
    ...issues.map((issue) => {
      const location = issue.line === undefined ? issue.path : `${issue.path}:${issue.line}`;
      return `- ${location}\n  ${issue.rule}: ${issue.message}`;
    }),
  ].join("\n");
}

export function runCli(cwd = process.cwd()) {
  const issues = checkDependencyPolicy(collectDependencyPolicyFiles(cwd));

  if (issues.length > 0) {
    console.error(formatDependencyPolicyIssues(issues));
    return 1;
  }

  console.log(formatDependencyPolicyIssues(issues));
  return 0;
}

function checkPackageManifests(files: SourceFileSnapshot[]) {
  const issues: DependencyPolicyIssue[] = [];

  for (const file of files) {
    if (!file.path.endsWith("package.json")) {
      continue;
    }

    const manifest = JSON.parse(file.source) as Record<string, unknown>;
    for (const section of packageDependencySections) {
      const dependencies = manifest[section];
      if (!isStringRecord(dependencies)) {
        continue;
      }

      for (const dependencyName of Object.keys(dependencies)) {
        if (!forbiddenDirectDependencies.has(dependencyName)) {
          continue;
        }

        issues.push({
          path: normalizeProjectPath(file.path),
          rule: "direct database dependency",
          message: `${section} に ${dependencyName} を直接追加しないでください。DBアクセスは @ticket-app/db のPrismaクライアントに集約してください。`,
        });
      }
    }
  }

  return issues;
}

function checkSourceImports(files: SourceFileSnapshot[]) {
  const issues: DependencyPolicyIssue[] = [];

  for (const file of files) {
    if (!isSourceFile(file.path)) {
      continue;
    }

    const sourceFile = ts.createSourceFile(
      file.path,
      file.source,
      ts.ScriptTarget.Latest,
      true,
      file.path.endsWith(".tsx") || file.path.endsWith(".jsx")
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.TS,
    );
    const prismaClientAliases = collectPrismaClientAliases(sourceFile);

    visitSourceFile(sourceFile, (node) => {
      const moduleId = getImportedModuleId(node);
      if (moduleId && isForbiddenSourceModule(moduleId)) {
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        issues.push({
          path: normalizeProjectPath(file.path),
          line: position.line + 1,
          rule: "direct database import",
          message: `${moduleId} を直接importしないでください。DBアクセスは @ticket-app/db のPrismaクライアントに集約してください。`,
        });
      }

      if (isForbiddenDbClientFactoryImport(file.path, node)) {
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        issues.push({
          path: normalizeProjectPath(file.path),
          line: position.line + 1,
          rule: "direct db client factory import",
          message:
            "createDbをDBパッケージ外からimportしないでください。Prisma Clientのsingletonは @ticket-app/db のdbに集約してください。",
        });
      }

      if (isForbiddenPrismaClientConstruction(file.path, node, prismaClientAliases)) {
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        issues.push({
          path: normalizeProjectPath(file.path),
          line: position.line + 1,
          rule: "direct Prisma client construction",
          message:
            "PrismaClientを直接newしないでください。DB clientのライフサイクルは @ticket-app/db に集約してください。",
        });
      }

      if (isForbiddenRawPrismaMethod(file.path, node)) {
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        issues.push({
          path: normalizeProjectPath(file.path),
          line: position.line + 1,
          rule: "raw Prisma query",
          message:
            "API実装でPrisma raw queryを使わないでください。必要な場合はADRで理由と削除条件を残してください。",
        });
      }
    });
  }

  return issues;
}

function collectPrismaClientAliases(sourceFile: ts.SourceFile) {
  const aliases = new Set(["PrismaClient"]);

  visitSourceFile(sourceFile, (node) => {
    if (!ts.isImportDeclaration(node) || !node.importClause?.namedBindings) {
      return;
    }

    if (!ts.isNamedImports(node.importClause.namedBindings)) {
      return;
    }

    for (const element of node.importClause.namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedName === "PrismaClient") {
        aliases.add(element.name.text);
      }
    }
  });

  return aliases;
}

function isForbiddenPrismaClientConstruction(
  path: string,
  node: ts.Node,
  prismaClientAliases: Set<string>,
) {
  if (normalizeProjectPath(path) === "packages/db/src/index.ts") {
    return false;
  }

  return (
    ts.isNewExpression(node) &&
    ts.isIdentifier(node.expression) &&
    prismaClientAliases.has(node.expression.text)
  );
}

function isForbiddenDbClientFactoryImport(path: string, node: ts.Node) {
  if (normalizeProjectPath(path).startsWith("packages/db/")) {
    return false;
  }

  if (!ts.isImportDeclaration(node) || !node.importClause?.namedBindings) {
    return false;
  }

  const moduleId = getImportedModuleId(node);
  if (!moduleId || !isDbPackageModule(moduleId)) {
    return false;
  }

  if (!ts.isNamedImports(node.importClause.namedBindings)) {
    return false;
  }

  return node.importClause.namedBindings.elements.some((element) => {
    const importedName = element.propertyName?.text ?? element.name.text;
    return importedName === "createDb";
  });
}

function isForbiddenRawPrismaMethod(path: string, node: ts.Node) {
  if (!normalizeProjectPath(path).startsWith("packages/api/src/")) {
    return false;
  }

  if (ts.isPropertyAccessExpression(node)) {
    return forbiddenPrismaRawMethods.has(node.name.text);
  }

  if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) {
    return forbiddenPrismaRawMethods.has(node.argumentExpression.text);
  }

  return false;
}

function getImportedModuleId(node: ts.Node) {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier.text;
  }

  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1
  ) {
    return getStringLiteralValue(node.arguments[0]);
  }

  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "require" &&
    node.arguments.length === 1
  ) {
    return getStringLiteralValue(node.arguments[0]);
  }

  return null;
}

function getStringLiteralValue(node: ts.Expression | undefined) {
  if (!node) {
    return null;
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  return null;
}

function isForbiddenSourceModule(moduleId: string) {
  return (
    forbiddenSourceModules.has(moduleId) ||
    moduleId.startsWith("pg/") ||
    moduleId.startsWith("postgres/")
  );
}

function isDbPackageModule(moduleId: string) {
  return moduleId === "@ticket-app/db" || moduleId.startsWith("@ticket-app/db/");
}

function visitSourceFile(sourceFile: ts.SourceFile, onNode: (node: ts.Node) => void) {
  function visit(node: ts.Node) {
    onNode(node);
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSourceFile(path: string) {
  return /\.(?:[cm]?[jt]sx?)$/.test(path);
}

function shouldIgnoreProjectPath(path: string) {
  const normalized = normalizeProjectPath(path);

  if (normalized.startsWith("packages/db/src/generated/")) {
    return true;
  }

  return normalized.split("/").some((part) => ignoredPathParts.has(part));
}

function collectProjectFiles(cwd: string) {
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

function collectFilesFromFileSystem(directory: string, cwd: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    const projectPath = normalizeProjectPath(relative(cwd, absolutePath));
    if (shouldIgnoreProjectPath(projectPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectFilesFromFileSystem(absolutePath, cwd));
      continue;
    }

    if (entry.isFile()) {
      files.push(projectPath);
    }
  }

  return files;
}

function isExistingFile(path: string) {
  return existsSync(path) && statSync(path).isFile();
}

function normalizeProjectPath(path: string) {
  return path
    .split(sep)
    .join("/")
    .replace(/^\.\/+/, "")
    .replace(/\/+$/, "");
}

function isDirectRun() {
  const scriptPath = process.argv[1];
  return !!scriptPath && resolve(scriptPath) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  process.exitCode = runCli();
}
