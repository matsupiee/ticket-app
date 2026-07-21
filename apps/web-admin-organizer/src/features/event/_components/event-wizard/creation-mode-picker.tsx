import { ArrowRightIcon, CheckIcon, Grid2X2Icon, XIcon, ZapIcon } from "lucide-react";

import { Button } from "@ticket-app/ui/components/button";

export type CreationMode = "simple" | "detailed";

const creationModes = [
  {
    value: "simple",
    title: "簡単イベント作成",
    description: "1公演・一般料金で、必要な入力だけに絞って作成します。",
    icon: ZapIcon,
    enabledItems: ["基本情報・公演・販売受付の3ステップ", "席種ごとの在庫数と価格を同じ画面で入力"],
    disabledItems: ["料金種別の追加・通し券は使いません"],
  },
  {
    value: "detailed",
    title: "詳細イベント作成",
    description: "複数公演・料金種別・通し券まで細かく設定します。",
    icon: Grid2X2Icon,
    enabledItems: ["基本情報から販売受付までの5ステップ", "複数公演・複数料金種別・通し券に対応"],
    disabledItems: [],
  },
] as const;

export function CreationModePicker({ onSelect }: { onSelect: (mode: CreationMode) => void }) {
  return (
    <div className="max-w-3xl">
      <p className="mb-4 text-sm text-muted-foreground">イベントの作成方法を選んでください。</p>
      <div className="grid gap-4 md:grid-cols-2">
        {creationModes.map((mode) => {
          const Icon = mode.icon;

          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => onSelect(mode.value)}
              className="group flex min-h-60 flex-col justify-between rounded-md border bg-background p-5 text-left transition-colors hover:border-foreground hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span>
                <span className="mb-4 flex size-10 items-center justify-center rounded-md bg-muted text-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="mb-1.5 block text-base font-bold">{mode.title}</span>
                <span className="block text-sm leading-relaxed text-muted-foreground">
                  {mode.description}
                </span>
              </span>

              <span className="mt-5 flex flex-col gap-2 text-xs text-muted-foreground">
                {mode.enabledItems.map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <CheckIcon className="size-3.5 text-foreground" strokeWidth={2.5} />
                    {item}
                  </span>
                ))}
                {mode.disabledItems.map((item) => (
                  <span key={item} className="flex items-center gap-2 text-muted-foreground/75">
                    <XIcon className="size-3.5" strokeWidth={2.5} />
                    {item}
                  </span>
                ))}
              </span>

              <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                選択する
                <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-5">
        <Button type="button" variant="outline" size="sm" onClick={() => onSelect("detailed")}>
          迷ったら詳細イベント作成ではじめる
        </Button>
      </div>
    </div>
  );
}
