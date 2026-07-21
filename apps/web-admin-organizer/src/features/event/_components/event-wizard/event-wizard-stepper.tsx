import { CheckIcon } from "lucide-react";

export const WIZARD_STEPS = [
  { num: 1, label: "STEP 1", title: "基本情報" },
  { num: 2, label: "STEP 2", title: "公演" },
  { num: 3, label: "STEP 3", title: "席種" },
  { num: 4, label: "STEP 4", title: "料金種別" },
  { num: 5, label: "STEP 5", title: "販売受付" },
] as const;

export function EventWizardStepper({
  currentStep,
  onGoToStep,
}: {
  currentStep: number;
  onGoToStep: (step: number) => void;
}) {
  return (
    <nav className="sticky top-6 flex flex-col">
      {WIZARD_STEPS.map((step, index) => {
        const isDone = step.num < currentStep;
        const isActive = step.num === currentStep;
        const isLast = index === WIZARD_STEPS.length - 1;

        return (
          <button
            key={step.num}
            type="button"
            onClick={() => onGoToStep(step.num)}
            className="group flex cursor-pointer gap-3.5 text-left"
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
