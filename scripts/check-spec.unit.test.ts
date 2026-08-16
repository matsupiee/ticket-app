import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkSpecs, formatStatus, readSpecSnapshot, runCli } from "./check-spec";

type SpecOverrides = {
  status?: string;
  acceptanceCriteria?: string;
  openQuestions?: string;
};

function buildSpec(overrides: SpecOverrides = {}) {
  const {
    status = "確定",
    acceptanceCriteria = "- [ ] AC-1: 主催者が一覧を開くと下書きイベントだけが表示される",
    openQuestions = "- [x] Q-1: 下書きを一覧に出すか → 出す",
  } = overrides;

  return [
    "# spec 0001: イベント一覧",
    "",
    "## ステータス",
    "",
    status,
    "",
    "## 目的",
    "",
    "主催者が自分のイベントの状態を把握できるようにする。",
    "",
    "## スコープ",
    "",
    "- 主催者向けイベント一覧",
    "",
    "## 非スコープ",
    "",
    "- 一覧からの一括編集",
    "",
    "## 受け入れ条件",
    "",
    acceptanceCriteria,
    "",
    "## 検証方法",
    "",
    "- AC-1: `handler.integration.test.ts`",
    "",
    "## 未決事項",
    "",
    openQuestions,
    "",
    "## 参照",
    "",
    "- なし",
    "",
  ].join("\n");
}

const indexContent = "- [spec/0001-event-list.md](./spec/0001-event-list.md): イベント一覧。\n";

describe("checkSpecs", () => {
  it("必須セクションが揃い未決事項が解決済みのspecは通る", () => {
    const issues = checkSpecs({
      specs: [{ path: "docs/spec/0001-event-list.md", content: buildSpec() }],
      indexContent,
    });

    expect(issues).toEqual([]);
  });

  it("未決事項が残ったまま確定にすると落ちる", () => {
    const issues = checkSpecs({
      specs: [
        {
          path: "docs/spec/0001-event-list.md",
          content: buildSpec({
            status: "確定",
            openQuestions: "- [ ] Q-1: 過去公演のデフォルト表示範囲",
          }),
        },
      ],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/open-questions",
        message:
          "未解決の未決事項が 1 件残っているため、ステータスを 確定 にできない。実装前に人間に確認する",
      },
    ]);
  });

  it("未決事項が残っていても draft なら落ちない", () => {
    const issues = checkSpecs({
      specs: [
        {
          path: "docs/spec/0001-event-list.md",
          content: buildSpec({
            status: "draft",
            openQuestions: "- [ ] Q-1: 過去公演のデフォルト表示範囲",
          }),
        },
      ],
      indexContent,
    });

    expect(issues).toEqual([]);
  });

  it("受け入れ条件が未達成のまま完了にすると落ちる", () => {
    const issues = checkSpecs({
      specs: [
        {
          path: "docs/spec/0001-event-list.md",
          content: buildSpec({
            status: "完了",
            acceptanceCriteria: [
              "- [x] AC-1: 下書きイベントだけが表示される",
              "- [ ] AC-2: 他主催者のイベントは403になる",
            ].join("\n"),
          }),
        },
      ],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/acceptance-criteria",
        message: "未達成の受け入れ条件が 1 件残っているため、ステータスを 完了 にできない",
      },
    ]);
  });

  it("受け入れ条件がチェックボックスで書かれていないと落ちる", () => {
    const issues = checkSpecs({
      specs: [
        {
          path: "docs/spec/0001-event-list.md",
          content: buildSpec({ acceptanceCriteria: "- 正しく動くこと" }),
        },
      ],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/acceptance-criteria",
        message: "## 受け入れ条件 をチェックボックス（`- [ ] AC-1: ...`）で1つ以上書く",
      },
    ]);
  });

  it("未決事項が空欄だと落ちる（論点なしは「- なし」と明記させる）", () => {
    const issues = checkSpecs({
      specs: [
        {
          path: "docs/spec/0001-event-list.md",
          content: buildSpec({ openQuestions: "特になし。" }),
        },
      ],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/open-questions",
        message: "## 未決事項 はチェックボックスで書く。論点が無い場合は `- なし` だけを書く",
      },
    ]);
  });

  it("未決事項が「- なし」なら通る", () => {
    const issues = checkSpecs({
      specs: [
        {
          path: "docs/spec/0001-event-list.md",
          content: buildSpec({ openQuestions: "- なし" }),
        },
      ],
      indexContent,
    });

    expect(issues).toEqual([]);
  });

  it("不明なステータスは落ちる", () => {
    const issues = checkSpecs({
      specs: [
        {
          path: "docs/spec/0001-event-list.md",
          content: buildSpec({ status: "レビュー中" }),
        },
      ],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/status",
        message: "## ステータス に draft / 確定 / 実装中 / 完了 / 破棄 のいずれか1つだけを書く",
      },
    ]);
  });

  it("必須セクションが欠けていると落ちる", () => {
    const content = buildSpec().replace("## 非スコープ\n\n- 一覧からの一括編集\n\n", "");

    const issues = checkSpecs({
      specs: [{ path: "docs/spec/0001-event-list.md", content }],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/sections",
        message: "必須セクションが不足している: ## 非スコープ",
      },
    ]);
  });

  it("セクションが空だと落ちる", () => {
    const content = buildSpec().replace("- 一覧からの一括編集", "");

    const issues = checkSpecs({
      specs: [{ path: "docs/spec/0001-event-list.md", content }],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/empty-section",
        message: "セクションが空になっている: ## 非スコープ",
      },
    ]);
  });

  it("ファイル名の番号と見出しの番号がずれていると落ちる", () => {
    const issues = checkSpecs({
      specs: [{ path: "docs/spec/0002-event-list.md", content: buildSpec() }],
      indexContent: "- [spec/0002-event-list.md](./spec/0002-event-list.md): イベント一覧。\n",
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0002-event-list.md",
        rule: "spec/title",
        message: "見出しのspec番号 0001 がファイル名の 0002 と一致していない",
      },
    ]);
  });

  it("ファイル名が採番規則に従っていないと落ちる", () => {
    const issues = checkSpecs({
      specs: [{ path: "docs/spec/event-list.md", content: buildSpec() }],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/event-list.md",
        rule: "spec/file-name",
        message: "specのファイル名は NNNN-kebab-case.md にする（例: 0001-event-search.md）",
      },
    ]);
  });

  it("spec番号が重複していると落ちる", () => {
    const issues = checkSpecs({
      specs: [
        { path: "docs/spec/0001-event-list.md", content: buildSpec() },
        { path: "docs/spec/0001-event-search.md", content: buildSpec() },
      ],
      indexContent,
    });

    expect(issues).toContainEqual({
      path: "docs/spec/0001-event-search.md",
      rule: "spec/duplicated-number",
      message:
        "spec番号 0001 が docs/spec/0001-event-list.md と重複している。未使用の連番を採番する",
    });
  });

  it("docs/INDEX.md に載っていないと落ちる", () => {
    const issues = checkSpecs({
      specs: [{ path: "docs/spec/0001-event-list.md", content: buildSpec() }],
      indexContent: "# docs index\n",
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/index",
        message: "docs/INDEX.md にこのspecへのリンク（spec/0001-event-list.md）を追記する",
      },
    ]);
  });

  it("docs/INDEX.md のリンク先ファイル名が実体と違うと落ちる", () => {
    const issues = checkSpecs({
      specs: [{ path: "docs/spec/0001-event-list.md", content: buildSpec() }],
      indexContent: "- [spec/0001-old-name.md](./spec/0001-old-name.md): 旧名。\n",
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/index",
        message: "docs/INDEX.md にこのspecへのリンク（spec/0001-event-list.md）を追記する",
      },
    ]);
  });

  it("「- なし」と未解決の論点が併記されていてもゲートは開かない", () => {
    const issues = checkSpecs({
      specs: [
        {
          path: "docs/spec/0001-event-list.md",
          content: buildSpec({
            status: "確定",
            openQuestions: ["- なし", "- [ ] Q-1: 過去公演のデフォルト表示範囲"].join("\n"),
          }),
        },
      ],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/open-questions",
        message:
          "未解決の未決事項が 1 件残っているため、ステータスを 確定 にできない。実装前に人間に確認する",
      },
    ]);
  });

  it("「- なし」に散文の論点が併記されているとチェックボックス不備として落ちる", () => {
    const issues = checkSpecs({
      specs: [
        {
          path: "docs/spec/0001-event-list.md",
          content: buildSpec({
            openQuestions: ["- なし", "- Q-1: 過去公演の表示範囲は要相談"].join("\n"),
          }),
        },
      ],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/open-questions",
        message: "## 未決事項 はチェックボックスで書く。論点が無い場合は `- なし` だけを書く",
      },
    ]);
  });

  it("実装中も未解決の未決事項があると落ちる", () => {
    const issues = checkSpecs({
      specs: [
        {
          path: "docs/spec/0001-event-list.md",
          content: buildSpec({
            status: "実装中",
            openQuestions: "- [ ] Q-1: 過去公演のデフォルト表示範囲",
          }),
        },
      ],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/open-questions",
        message:
          "未解決の未決事項が 1 件残っているため、ステータスを 実装中 にできない。実装前に人間に確認する",
      },
    ]);
  });

  it("破棄は未解決の未決事項が残っていてもよい", () => {
    const issues = checkSpecs({
      specs: [
        {
          path: "docs/spec/0001-event-list.md",
          content: buildSpec({
            status: "破棄",
            openQuestions: "- [ ] Q-1: 過去公演のデフォルト表示範囲",
          }),
        },
      ],
      indexContent,
    });

    expect(issues).toEqual([]);
  });

  it("必須セクションの順序が入れ替わっていると落ちる", () => {
    const content = buildSpec()
      .replace("## スコープ\n\n- 主催者向けイベント一覧\n\n", "")
      .replace("## 非スコープ", "## 非スコープ\n\n- 一覧からの一括編集\n\n## スコープ");

    const issues = checkSpecs({
      specs: [{ path: "docs/spec/0001-event-list.md", content }],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/sections",
        message:
          "必須セクションは ## ステータス → ## 目的 → ## スコープ → ## 非スコープ → ## 受け入れ条件 → ## 検証方法 → ## 未決事項 → ## 参照 の順に並べる",
      },
    ]);
  });

  it("コードフェンス内の見出しとチェックボックスは仕様として解釈しない", () => {
    const content = buildSpec({
      status: "確定",
      openQuestions: [
        "- [x] Q-1: 解決済み",
        "",
        "書式の例:",
        "",
        "```md",
        "## ステータス",
        "",
        "- [ ] Q-9: これは例示なので未決事項ではない",
        "```",
      ].join("\n"),
    });

    const issues = checkSpecs({
      specs: [{ path: "docs/spec/0001-event-list.md", content }],
      indexContent,
    });

    expect(issues).toEqual([]);
  });

  it("サブディレクトリに置かれたspecは置き場所違反として落ちる", () => {
    const issues = checkSpecs({
      specs: [{ path: "docs/spec/archive/0002-hidden.md", content: buildSpec() }],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/archive/0002-hidden.md",
        rule: "spec/location",
        message: "specは docs/spec 直下に置く。サブディレクトリは使わない",
      },
    ]);
  });

  it("見出しが1行目に無いと落ちる", () => {
    const content = `前書き\n\n${buildSpec()}`;

    const issues = checkSpecs({
      specs: [{ path: "docs/spec/0001-event-list.md", content }],
      indexContent,
    });

    expect(issues).toEqual([
      {
        path: "docs/spec/0001-event-list.md",
        rule: "spec/title",
        message: "1行目の見出しを `# spec NNNN: <タイトル>` にする",
      },
    ]);
  });
});

describe("readSpecSnapshot / runCli", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "check-spec-"));
    mkdirSync(join(cwd, "docs", "spec"), { recursive: true });
    writeSpecFixture("README.md", "# spec の書き方\n");
    writeSpecFixture("TEMPLATE.md", "# spec NNNN: <タイトル>\n");
    writeFileSync(join(cwd, "docs", "INDEX.md"), indexContent, "utf8");
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function writeSpecFixture(relativePath: string, content: string) {
    const path = join(cwd, "docs", "spec", relativePath);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, content, "utf8");
  }

  it("README.md と TEMPLATE.md は検査対象から除外する", () => {
    const snapshot = readSpecSnapshot(cwd);

    expect(snapshot.specs).toEqual([]);
    expect(checkSpecs(snapshot)).toEqual([]);
  });

  it("サブディレクトリのspecも拾って置き場所違反にする", () => {
    writeSpecFixture("archive/0002-hidden.md", buildSpec());

    const issues = checkSpecs(readSpecSnapshot(cwd));

    expect(issues).toEqual([
      {
        path: "docs/spec/archive/0002-hidden.md",
        rule: "spec/location",
        message: "specは docs/spec 直下に置く。サブディレクトリは使わない",
      },
    ]);
  });

  it("問題があれば終了コード1を返す", () => {
    writeSpecFixture(
      "0001-event-list.md",
      buildSpec({ status: "確定", openQuestions: "- [ ] Q-1: 未回答" }),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(runCli(cwd, [])).toBe(1);
    expect(error.mock.calls[0]?.[0]).toContain("spec/open-questions");
  });

  it("問題が無ければ終了コード0を返す", () => {
    writeSpecFixture("0001-event-list.md", buildSpec());
    vi.spyOn(console, "log").mockImplementation(() => {});

    expect(runCli(cwd, [])).toBe(0);
  });

  it("--status は進行中のspecと未決事項の件数を表示する", () => {
    writeSpecFixture(
      "0001-event-list.md",
      buildSpec({ status: "draft", openQuestions: "- [ ] Q-1: 未回答" }),
    );

    expect(formatStatus(readSpecSnapshot(cwd))).toBe(
      [
        "進行中のspec（docs/loop-engineering.md）:",
        "  docs/spec/0001-event-list.md [draft] 受け入れ条件 0/1 / 未決事項 1件 → 実装前に人間へ確認する",
      ].join("\n"),
    );
  });

  it("--status は完了したspecを表示しない", () => {
    writeSpecFixture(
      "0001-event-list.md",
      buildSpec({
        status: "完了",
        acceptanceCriteria: "- [x] AC-1: 下書きイベントだけが表示される",
      }),
    );

    expect(formatStatus(readSpecSnapshot(cwd))).toBe(
      "進行中のspecはありません（docs/loop-engineering.md）",
    );
  });
});
