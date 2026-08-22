// 開発用 seed のエントリーポイント。
//
// 実際のデータ作成は `senarios/<受付方式>/<販売方式>/<パターン>.ts` が持ち、
// このファイルはそれらを順に実行して結果を表示するだけにする。
// シナリオごとに 1 トランザクションで完結させるため、途中のシナリオが失敗しても
// そのシナリオのデータだけが巻き戻り、成功済みのシナリオは残る。
//
// seed は空のDBに対して実行する前提。`bun run db:push`（--force-reset）でDBを作り直してから実行する。
// 同じDBに対して2回実行すると、シナリオが固定値で作るユーザーのメールアドレスが衝突して失敗する。
import { disconnectDb } from "../index";
import { seed as seedEntryNumberFirstCome1Stage2InventoryCategory1SaleWindow } from "./senarios/entry-number/first-come/1stage-2inventory-category-1sale-window";

type SeedScenario = {
  // senarios 配下の相対パス。ログにそのまま出して、どのファイルが失敗したか分かるようにする
  name: string;
  seed: () => Promise<void>;
};

// 実装済みのシナリオだけを登録する。senarios 配下にファイルを追加したらここへ1件足す。
// バレルimportは禁止（docs/coding-pattern/frontend.md）なので、シナリオは直接importする。
const seedScenarios: SeedScenario[] = [
  {
    name: "entry-number/first-come/1stage-2inventory-category-1sale-window",
    seed: seedEntryNumberFirstCome1Stage2InventoryCategory1SaleWindow,
  },
];

async function runSeedScenarios() {
  for (const scenario of seedScenarios) {
    await scenario.seed();
    console.info(`Seeded: ${scenario.name}`);
  }

  return { scenarioCount: seedScenarios.length };
}

if (import.meta.main) {
  try {
    const result = await runSeedScenarios();
    console.info(`Seed data created. scenarios=${result.scenarioCount}`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await disconnectDb();
  }
}
