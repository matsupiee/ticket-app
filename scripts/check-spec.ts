import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type CheckIssue = {
  path: string;
  rule: string;
  message: string;
};

export type SpecFile = {
  path: string;
  content: string;
};

export type SpecSnapshot = {
  specs: SpecFile[];
  indexContent: string;
};

const specRoot = "docs/spec";
const indexPath = "docs/INDEX.md";
const nonSpecFileNames = new Set(["README.md", "TEMPLATE.md"]);

const specFileNamePattern = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const specTitlePattern = /^# spec (\d{4}): \S/;
const checkboxPattern = /^[-*] \[[ xX]\]/;
const uncheckedPattern = /^[-*] \[ \]/;
const fencePattern = /^\s*(?:`{3,}|~{3,})/;

/** docs/spec/README.md の必須セクション。順序も含めて一致させる。 */
const requiredSections = [
  "ステータス",
  "目的",
  "スコープ",
  "非スコープ",
  "受け入れ条件",
  "検証方法",
  "未決事項",
  "参照",
] as const;

const knownStatuses = ["draft", "確定", "実装中", "完了", "破棄"] as const;
type Status = (typeof knownStatuses)[number];

/** このステータスに進むには、未決事項がすべて解決している必要がある。 */
const statusesRequiringResolvedQuestions = new Set<Status>(["確定", "実装中", "完了"]);

type Section = {
  heading: string;
  /** セクションの全行。空セクション判定に使う。 */
  lines: string[];
  /** コードフェンスの外側の行だけ。仕様の記述として解釈するのはこちら。 */
  plainLines: string[];
};

type ParsedSpec = {
  titleNumber: string | undefined;
  sections: Section[];
};

export function checkSpecs(snapshot: SpecSnapshot): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const numbersSeen = new Map<string, string>();

  for (const spec of [...snapshot.specs].sort((a, b) => a.path.localeCompare(b.path))) {
    const relativePath = spec.path.slice(`${specRoot}/`.length);

    // サブディレクトリに置くと検査対象から外れたように見えてしまうため、置き場所自体を規約違反にする。
    if (relativePath.includes("/")) {
      issues.push({
        path: spec.path,
        rule: "spec/location",
        message: `specは ${specRoot} 直下に置く。サブディレクトリは使わない`,
      });
      continue;
    }

    const fileNameMatch = specFileNamePattern.exec(relativePath);
    if (!fileNameMatch) {
      issues.push({
        path: spec.path,
        rule: "spec/file-name",
        message: "specのファイル名は NNNN-kebab-case.md にする（例: 0001-event-search.md）",
      });
      continue;
    }

    const number = fileNameMatch[1]!;
    const duplicatedWith = numbersSeen.get(number);
    if (duplicatedWith) {
      issues.push({
        path: spec.path,
        rule: "spec/duplicated-number",
        message: `spec番号 ${number} が ${duplicatedWith} と重複している。未使用の連番を採番する`,
      });
    } else {
      numbersSeen.set(number, spec.path);
    }

    issues.push(...checkSpecFile(spec, relativePath, number, snapshot.indexContent));
  }

  return issues;
}

function checkSpecFile(
  spec: SpecFile,
  fileName: string,
  number: string,
  indexContent: string,
): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const parsed = parseSpec(spec.content);

  if (!parsed.titleNumber) {
    issues.push({
      path: spec.path,
      rule: "spec/title",
      message: "1行目の見出しを `# spec NNNN: <タイトル>` にする",
    });
  } else if (parsed.titleNumber !== number) {
    issues.push({
      path: spec.path,
      rule: "spec/title",
      message: `見出しのspec番号 ${parsed.titleNumber} がファイル名の ${number} と一致していない`,
    });
  }

  const sectionIssues = checkSections(spec.path, parsed.sections);
  issues.push(...sectionIssues);

  if (!indexContent.includes(`${specRoot.slice("docs/".length)}/${fileName}`)) {
    issues.push({
      path: spec.path,
      rule: "spec/index",
      message: `${indexPath} にこのspecへのリンク（${specRoot.slice("docs/".length)}/${fileName}）を追記する`,
    });
  }

  // セクション構成が崩れている状態で中身を評価しても、二次的なエラーが並ぶだけなので打ち切る。
  if (sectionIssues.length > 0) {
    return issues;
  }

  const status = readStatus(parsed);
  if (!status) {
    issues.push({
      path: spec.path,
      rule: "spec/status",
      message: `## ステータス に ${knownStatuses.join(" / ")} のいずれか1つだけを書く`,
    });
    return issues;
  }

  issues.push(...checkAcceptanceCriteria(spec.path, parsed, status));
  issues.push(...checkOpenQuestions(spec.path, parsed, status));

  return issues;
}

function checkSections(path: string, sections: Section[]): CheckIssue[] {
  const headings = sections.map((section) => section.heading);
  const missing = requiredSections.filter((required) => !headings.includes(required));

  if (missing.length > 0) {
    return [
      {
        path,
        rule: "spec/sections",
        message: `必須セクションが不足している: ${missing.map((name) => `## ${name}`).join(", ")}`,
      },
    ];
  }

  const orderedHeadings = headings.filter((heading) => isRequiredSection(heading));
  if (orderedHeadings.join("\n") !== requiredSections.join("\n")) {
    return [
      {
        path,
        rule: "spec/sections",
        message: `必須セクションは ${requiredSections
          .map((name) => `## ${name}`)
          .join(" → ")} の順に並べる`,
      },
    ];
  }

  const empty = sections
    .filter((section) => isRequiredSection(section.heading))
    .filter((section) => section.lines.every((line) => line.trim() === ""))
    .map((section) => `## ${section.heading}`);

  if (empty.length > 0) {
    return [
      {
        path,
        rule: "spec/empty-section",
        message: `セクションが空になっている: ${empty.join(", ")}`,
      },
    ];
  }

  return [];
}

function checkAcceptanceCriteria(path: string, parsed: ParsedSpec, status: Status): CheckIssue[] {
  const criteria = countCheckboxes(findSection(parsed, "受け入れ条件"));

  if (criteria.total === 0) {
    return [
      {
        path,
        rule: "spec/acceptance-criteria",
        message: "## 受け入れ条件 をチェックボックス（`- [ ] AC-1: ...`）で1つ以上書く",
      },
    ];
  }

  if (status === "完了" && criteria.unchecked > 0) {
    return [
      {
        path,
        rule: "spec/acceptance-criteria",
        message: `未達成の受け入れ条件が ${criteria.unchecked} 件残っているため、ステータスを 完了 にできない`,
      },
    ];
  }

  return [];
}

function checkOpenQuestions(path: string, parsed: ParsedSpec, status: Status): CheckIssue[] {
  const section = findSection(parsed, "未決事項");
  const questions = countCheckboxes(section);

  // 「- なし」はセクションの中身がその1行だけのときにしか認めない。
  // 併記を許すと、未決の論点を散文で書いて「- なし」を添えるだけでゲートが開いてしまう。
  if (isNoneOnly(section)) {
    return [];
  }

  if (questions.total === 0) {
    return [
      {
        path,
        rule: "spec/open-questions",
        message: "## 未決事項 はチェックボックスで書く。論点が無い場合は `- なし` だけを書く",
      },
    ];
  }

  if (statusesRequiringResolvedQuestions.has(status) && questions.unchecked > 0) {
    return [
      {
        path,
        rule: "spec/open-questions",
        message: `未解決の未決事項が ${questions.unchecked} 件残っているため、ステータスを ${status} にできない。実装前に人間に確認する`,
      },
    ];
  }

  return [];
}

function parseSpec(content: string): ParsedSpec {
  const lines = content.split("\n");
  const sections: Section[] = [];
  let current: Section | undefined;
  let insideFence = false;

  for (const line of lines) {
    // コードフェンス内は仕様の記述ではなく例示なので、見出しもチェックボックスも解釈しない。
    if (fencePattern.test(line)) {
      insideFence = !insideFence;
      current?.lines.push(line);
      continue;
    }

    if (insideFence) {
      current?.lines.push(line);
      continue;
    }

    if (line.startsWith("## ")) {
      current = { heading: line.slice("## ".length).trim(), lines: [], plainLines: [] };
      sections.push(current);
      continue;
    }

    if (line.startsWith("# ")) {
      continue;
    }

    current?.lines.push(line);
    current?.plainLines.push(line);
  }

  // 見出しは1行目に置く規約なので、途中に現れた `# spec NNNN:` は採用しない。
  const titleMatch = specTitlePattern.exec(lines[0] ?? "");

  return { titleNumber: titleMatch?.[1], sections };
}

function isRequiredSection(heading: string) {
  return (requiredSections as readonly string[]).includes(heading);
}

function findSection(parsed: ParsedSpec, heading: string): Section | undefined {
  return parsed.sections.find((section) => section.heading === heading);
}

/** セクションのうち、空行とHTMLコメントを除いた実質的な行。 */
function meaningfulLines(section: Section | undefined) {
  return (section?.plainLines ?? [])
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("<!--"));
}

function readStatus(parsed: ParsedSpec): Status | undefined {
  const values = meaningfulLines(findSection(parsed, "ステータス"));

  if (values.length !== 1) {
    return undefined;
  }

  return knownStatuses.find((status) => status === values[0]);
}

function countCheckboxes(section: Section | undefined) {
  const items = meaningfulLines(section).filter((line) => checkboxPattern.test(line));
  const unchecked = items.filter((line) => uncheckedPattern.test(line)).length;

  return { total: items.length, unchecked };
}

function isNoneOnly(section: Section | undefined) {
  const lines = meaningfulLines(section);

  return lines.length === 1 && /^[-*]\s*なし\s*$/.test(lines[0]!);
}

export function readSpecSnapshot(cwd = process.cwd()): SpecSnapshot {
  const specDir = join(cwd, ...specRoot.split("/"));

  return {
    specs: isExistingDirectory(specDir) ? collectSpecFiles(specDir, specRoot) : [],
    indexContent: readFileSync(join(cwd, ...indexPath.split("/")), "utf8"),
  };
}

/** サブディレクトリも拾う。置き場所の違反は checkSpecs 側で issue にする。 */
function collectSpecFiles(directory: string, projectPath: string): SpecFile[] {
  const specs: SpecFile[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = `${projectPath}/${entry.name}`;

    if (entry.isDirectory()) {
      specs.push(...collectSpecFiles(join(directory, entry.name), entryPath));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    // README.md / TEMPLATE.md は spec 本体ではないので検査対象外。
    if (projectPath === specRoot && nonSpecFileNames.has(entry.name)) {
      continue;
    }

    specs.push({ path: entryPath, content: readFileSync(join(directory, entry.name), "utf8") });
  }

  return specs;
}

export function formatIssues(issues: CheckIssue[]) {
  if (issues.length === 0) {
    return `${specRoot} spec rules: OK`;
  }

  return [
    `${specRoot} の規約違反が見つかりました（${specRoot}/README.md）。`,
    "",
    ...issues.map((issue) => `- ${issue.path}\n  ${issue.rule}: ${issue.message}`),
  ].join("\n");
}

/** SessionStart hook から呼ぶ。進行中のspecを一覧して現在地を示す。 */
export function formatStatus(snapshot: SpecSnapshot) {
  const rows = snapshot.specs
    .map((spec) => {
      const parsed = parseSpec(spec.content);
      const criteria = countCheckboxes(findSection(parsed, "受け入れ条件"));
      const questions = countCheckboxes(findSection(parsed, "未決事項"));

      return { path: spec.path, status: readStatus(parsed) ?? "不明", criteria, questions };
    })
    .filter((row) => row.status !== "完了" && row.status !== "破棄")
    .sort((a, b) => a.path.localeCompare(b.path));

  if (rows.length === 0) {
    return "進行中のspecはありません（docs/loop-engineering.md）";
  }

  return [
    "進行中のspec（docs/loop-engineering.md）:",
    ...rows.map((row) => {
      const done = row.criteria.total - row.criteria.unchecked;
      const suffix =
        row.questions.unchecked > 0
          ? ` / 未決事項 ${row.questions.unchecked}件 → 実装前に人間へ確認する`
          : "";

      return `  ${row.path} [${row.status}] 受け入れ条件 ${done}/${row.criteria.total}${suffix}`;
    }),
  ].join("\n");
}

export function runCli(cwd = process.cwd(), argv = process.argv.slice(2)) {
  const snapshot = readSpecSnapshot(cwd);

  if (argv.includes("--status")) {
    console.log(formatStatus(snapshot));
    return 0;
  }

  const issues = checkSpecs(snapshot);
  if (issues.length > 0) {
    console.error(formatIssues(issues));
    return 1;
  }

  console.log(formatIssues(issues));
  return 0;
}

function isExistingDirectory(path: string) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isDirectRun() {
  const scriptPath = process.argv[1];
  return !!scriptPath && resolve(scriptPath) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  process.exitCode = runCli();
}
