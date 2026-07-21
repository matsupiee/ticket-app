import { CheckIcon } from "lucide-react";

export type EventWizardStepKey =
  | "basic"
  | "performances"
  | "seat-categories"
  | "rate-types"
  | "sale-windows"
  | "simple-ticketing";

export type EventWizardStep = {
  num: number;
  label: string;
  title: string;
  description: string;
  stepKey: EventWizardStepKey;
  saveSteps: readonly number[];
};

export const WIZARD_STEPS = [
  {
    num: 1,
    label: "STEP 1",
    title: "基本情報",
    description: "イベント名と説明を入力します。",
    stepKey: "basic",
    saveSteps: [1],
  },
  {
    num: 2,
    label: "STEP 2",
    title: "公演",
    description: "公演ごとに会場と日程を登録します。ツアーは公演を複数追加します。",
    stepKey: "performances",
    saveSteps: [2],
  },
  {
    num: 3,
    label: "STEP 3",
    title: "席種",
    description: "席種を定義し、公演ごとの在庫数を設定します。",
    stepKey: "seat-categories",
    saveSteps: [3],
  },
  {
    num: 4,
    label: "STEP 4",
    title: "料金種別",
    description: "料金種別を定義し、席種ごとの標準価格を設定します。",
    stepKey: "rate-types",
    saveSteps: [4],
  },
  {
    num: 5,
    label: "STEP 5",
    title: "販売受付",
    description:
      "受付ごとに販売する券を1件ずつ登録します。価格は標準価格から引き継ぎ、受付・公演ごとに変更できます。",
    stepKey: "sale-windows",
    saveSteps: [5],
  },
] as const satisfies readonly EventWizardStep[];

export const SIMPLE_WIZARD_STEPS = [
  {
    num: 1,
    label: "STEP 1",
    title: "基本情報",
    description: "イベント名と説明を入力します。",
    stepKey: "basic",
    saveSteps: [1],
  },
  {
    num: 2,
    label: "STEP 2",
    title: "公演・券種",
    description: "1公演の会場・日程と、席種ごとの在庫数・価格を入力します。",
    stepKey: "simple-ticketing",
    saveSteps: [2, 3, 4],
  },
  {
    num: 3,
    label: "STEP 3",
    title: "販売受付",
    description: "受付期間と販売する券を登録します。",
    stepKey: "sale-windows",
    saveSteps: [5],
  },
] as const satisfies readonly EventWizardStep[];

export function EventWizardStepper({
  currentStep,
  onGoToStep,
  isStepDisabled,
  steps = WIZARD_STEPS,
}: {
  currentStep: number;
  onGoToStep: (step: number) => void;
  isStepDisabled?: (step: number) => boolean;
  steps?: readonly EventWizardStep[];
}) {
  return (
    <nav className="sticky top-6 flex flex-col">
      {steps.map((step, index) => {
        const isDone = step.num < currentStep;
        const isActive = step.num === currentStep;
        const isLast = index === steps.length - 1;
        const disabled = !isActive && (isStepDisabled?.(step.num) ?? false);

        return (
          <button
            key={step.num}
            type="button"
            disabled={disabled}
            title={disabled ? "公演を追加すると選択できます" : undefined}
            onClick={() => onGoToStep(step.num)}
            className={`group flex gap-3.5 text-left ${
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          >
            <div className="flex flex-col items-center">
              {isDone ? (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground">
                  <CheckIcon className="size-3.5 text-background" strokeWidth={3} />
                </span>
              ) : isActive ? (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-background">
                  <span className="size-2.5 rounded-full bg-foreground" />
                </span>
              ) : (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold text-muted-foreground">
                  {step.num}
                </span>
              )}
              {!isLast && (
                <span
                  className={`min-h-8.5 w-0.5 flex-1 ${isDone ? "bg-foreground" : "bg-border"}`}
                />
              )}
            </div>
            <div className="pt-0.5 pb-7.5">
              <div className="mb-0.5 text-[11px] font-semibold tracking-wider text-muted-foreground/80">
                {step.label}
              </div>
              <div
                className={
                  isActive || isDone
                    ? "text-sm font-semibold text-foreground"
                    : "text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground"
                }
              >
                {step.title}
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
