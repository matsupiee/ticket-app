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
  lines: string[];
};

type ParsedSpec = {
  titleNumber: string | undefined;
  sections: Section[];
};

export function checkSpecs(snapshot: SpecSnapshot): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const numbersSeen = new Map<string, string>();

  for (const spec of [...snapshot.specs].sort((a, b) => a.path.localeCompare(b.path))) {
    const fileName = spec.path.slice(spec.path.lastIndexOf("/") + 1);
    const fileNameMatch = specFileNamePattern.exec(fileName);

    if (!fileNameMatch) {
      issues.push({
        path: spec.path,
        rule: "spec/file-name",
        message: `specのファイル名は NNNN-kebab-case.md にする（例: 0001-event-search.md）`,
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

    issues.push(...checkSpecFile(spec, number, snapshot.indexContent));
  }

  return issues;
}

function checkSpecFile(spec: SpecFile, number: string, indexContent: string): CheckIssue[] {
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

  if (!indexContent.includes(`${specRoot.slice("docs/".length)}/${number}`)) {
    issues.push({
      path: spec.path,
      rule: "spec/index",
      message: `${indexPath} にこのspecへのリンクを追記する`,
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

  const orderedHeadings = headings.filter((heading) =>
    (requiredSections as readonly string[]).includes(heading),
  );
  if (orderedHeadings.join("\n") !== requiredSections.join("\n")) {
    return [
      {
        path,
        rule: "spec/sections",
        message: `必須セクションは ${requiredSections.map((name) => `## ${name}`).join(" → ")} の順に並べる`,
      },
    ];
  }

  const empty = sections
    .filter((section) => (requiredSections as readonly string[]).includes(section.heading))
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
  const issues: CheckIssue[] = [];
  const criteria = countCheckboxes(findSection(parsed, "受け入れ条件"));

  if (criteria.total === 0) {
    issues.push({
      path,
      rule: "spec/acceptance-criteria",
      message: "## 受け入れ条件 をチェックボックス（`- [ ] AC-1: ...`）で1つ以上書く",
    });
    return issues;
  }

  if (status === "完了" && criteria.unchecked > 0) {
    issues.push({
      path,
      rule: "spec/acceptance-criteria",
      message: `未達成の受け入れ条件が ${criteria.unchecked} 件残っているため、ステータスを 完了 にできない`,
    });
  }

  return issues;
}

function checkOpenQuestions(path: string, parsed: ParsedSpec, status: Status): CheckIssue[] {
  const section = findSection(parsed, "未決事項");
  const questions = countCheckboxes(section);

  if (questions.total === 0 && !hasNoneMarker(section)) {
    return [
      {
        path,
        rule: "spec/open-questions",
        message: "## 未決事項 はチェックボックスで書く。論点が無い場合は `- なし` と明記する",
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
  let titleNumber: string | undefined;
  let current: Section | undefined;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      const titleMatch = specTitlePattern.exec(line);
      titleNumber ??= titleMatch?.[1];
      continue;
    }

    if (line.startsWith("## ")) {
      current = { heading: line.slice("## ".length).trim(), lines: [] };
      sections.push(current);
      continue;
    }

    current?.lines.push(line);
  }

  return { titleNumber, sections };
}

function findSection(parsed: ParsedSpec, heading: string): Section | undefined {
  return parsed.sections.find((section) => section.heading === heading);
}

function readStatus(parsed: ParsedSpec): Status | undefined {
  const lines = findSection(parsed, "ステータス")?.lines ?? [];
  const values = lines
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("<!--"))
    .map((line) => line.replace(/^[-*]\s*/, ""));

  if (values.length !== 1) {
    return undefined;
  }

  return knownStatuses.find((status) => status === values[0]);
}

function countCheckboxes(section: Section | undefined) {
  const items = (section?.lines ?? [])
    .map((line) => line.trim())
    .filter((line) => /^[-*] \[[ xX]\]/.test(line));

  const unchecked = items.filter((line) => /^[-*] \[ \]/.test(line)).length;

  return { total: items.length, unchecked };
}

function hasNoneMarker(section: Section | undefined) {
  return (section?.lines ?? []).some((line) => /^[-*]\s*なし\s*$/.test(line.trim()));
}

export function readSpecSnapshot(cwd = process.cwd()): SpecSnapshot {
  const specDir = join(cwd, ...specRoot.split("/"));
  const specs: SpecFile[] = [];

  if (isExistingDirectory(specDir)) {
    for (const entry of readdirSync(specDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }
      // README.md / TEMPLATE.md は spec 本体ではないので検査対象外。
      if (nonSpecFileNames.has(entry.name)) {
        continue;
      }
      specs.push({
        path: `${specRoot}/${entry.name}`,
        content: readFileSync(join(specDir, entry.name), "utf8"),
      });
    }
  }

  return {
    specs,
    indexContent: readFileSync(join(cwd, ...indexPath.split("/")), "utf8"),
  };
}

/** SessionStart hook から呼ぶ。進行中のspecを一覧して現在地を示す。 */
function printStatus(snapshot: SpecSnapshot) {
  const rows = snapshot.specs
    .map((spec) => {
      const parsed = parseSpec(spec.content);
      const status = readStatus(parsed) ?? "不明";
      const criteria = countCheckboxes(findSection(parsed, "受け入れ条件"));
      const questions = countCheckboxes(findSection(parsed, "未決事項"));
      return { path: spec.path, status, criteria, questions };
    })
    .filter((row) => row.status !== "完了" && row.status !== "破棄")
    .sort((a, b) => a.path.localeCompare(b.path));

  if (rows.length === 0) {
    console.log("進行中のspecはありません（docs/loop-engineering.md）");
    return;
  }

  console.log("進行中のspec（docs/loop-engineering.md）:");
  for (const row of rows) {
    const done = row.criteria.total - row.criteria.unchecked;
    const suffix =
      row.questions.unchecked > 0
        ? ` / 未決事項 ${row.questions.unchecked}件 → 実装前に人間へ確認する`
        : "";
    console.log(
      `  ${row.path} [${row.status}] 受け入れ条件 ${done}/${row.criteria.total}${suffix}`,
    );
  }
}

export function runCli(argv: string[] = process.argv.slice(2)) {
  const snapshot = readSpecSnapshot();

  if (argv.includes("--status")) {
    printStatus(snapshot);
    return 0;
  }

  const issues = checkSpecs(snapshot);
  if (issues.length === 0) {
    return 0;
  }

  for (const issue of issues) {
    console.error(`${issue.path}: [${issue.rule}] ${issue.message}`);
  }
  console.error(`\nspecの検査で ${issues.length} 件の問題が見つかりました（docs/spec/README.md）`);

  return 1;
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
