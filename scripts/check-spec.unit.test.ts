import { describe, expect, it } from "vitest";

import { checkSpecs } from "./check-spec";

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
        message: "## 未決事項 はチェックボックスで書く。論点が無い場合は `- なし` と明記する",
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
        message: "docs/INDEX.md にこのspecへのリンクを追記する",
      },
    ]);
  });
});
