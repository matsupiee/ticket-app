import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { toast } from "sonner";

import type { GetEventOutput } from "@ticket-app/api/routers/organizer/event/get/route";

import { client } from "@/lib/orpc";

import { EventWizardStepper, SIMPLE_WIZARD_STEPS, WIZARD_STEPS } from "./event-wizard-stepper";
import { CreationModePicker, type CreationMode } from "./creation-mode-picker";
import { StepBasicInfo } from "./step-basic-info";
import { StepPerformances } from "./step-performances";
import { StepRateTypes } from "./step-rate-types";
import { StepSaleWindows } from "./step-sale-windows";
import { StepSeatCategories } from "./step-seat-categories";
import { StepSimpleTicketing } from "./step-simple-ticketing";
import { useEventWizardDraft } from "./use-event-wizard-draft";
import { EventStatusBadge } from "../status-badge";

export function EventWizard({
  mode,
  eventOrganizerId,
  initialEvent,
}: {
  mode: "create" | "edit";
  eventOrganizerId: string;
  initialEvent?: GetEventOutput;
}) {
  const navigate = useNavigate();
  const { draft, dispatch, saveSteps } = useEventWizardDraft({
    mode,
    eventOrganizerId,
    initialEvent,
  });
  const [creationMode, setCreationMode] = useState<CreationMode | null>(
    mode === "edit" ? "detailed" : null,
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const steps = creationMode === "simple" ? SIMPLE_WIZARD_STEPS : WIZARD_STEPS;
  const currentStepIndex = steps.findIndex((step) => step.num === currentStep);
  const currentStepConfig = steps[currentStepIndex] ?? steps[0];
  const nextStepConfig = currentStepIndex >= 0 ? steps[currentStepIndex + 1] : undefined;
  const previousStepConfig = currentStepIndex > 0 ? steps[currentStepIndex - 1] : undefined;
  const activeSeatCategories = draft.seatCategories.filter((seatCategory) => seatCategory.active);
  const hasPerformances = draft.performances.length > 0;
  const hasSimpleTicketing = hasPerformances && activeSeatCategories.length > 0;
  const hasSavedSimpleTicketing =
    draft.performances.some((performance) => performance.id) &&
    activeSeatCategories.some((seatCategory) => seatCategory.id) &&
    draft.rateTypes.some((rateType) => rateType.id);
  const isPickerVisible = mode === "create" && creationMode === null;
  const canChangeCreationMode = mode === "create" && Boolean(creationMode) && !draft.eventId;
  const isStepBlocked = (step: number) => {
    const targetStep = steps.find((candidate) => candidate.num === step);
    if (!targetStep) {
      return false;
    }
    if (creationMode === "simple" && targetStep.stepKey === "sale-windows" && !hasSimpleTicketing) {
      return true;
    }
    if (
      creationMode === "simple" &&
      targetStep.stepKey === "sale-windows" &&
      currentStepConfig?.stepKey !== "simple-ticketing" &&
      !hasSavedSimpleTicketing
    ) {
      return true;
    }
    return targetStep.stepKey === "seat-categories" ||
      targetStep.stepKey === "rate-types" ||
      targetStep.stepKey === "sale-windows"
      ? !hasPerformances
      : false;
  };
  const isNextDisabled = isSaving || Boolean(nextStepConfig && isStepBlocked(nextStepConfig.num));

  function handleSelectCreationMode(nextMode: CreationMode) {
    setCreationMode(nextMode);
    setCurrentStep(1);
    if (nextMode === "simple") {
      dispatch({ type: "APPLY_SIMPLE_CREATION_PRESET" });
    }
  }

  function handleResetCreationMode() {
    dispatch({ type: "RESET_DRAFT" });
    setCreationMode(null);
    setCurrentStep(1);
  }

  async function persistCurrentStep() {
    if (!currentStepConfig) {
      return false;
    }

    setIsSaving(true);
    try {
      await saveSteps(currentStepConfig.saveSteps);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存に失敗しました");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveDraft() {
    const ok = await persistCurrentStep();
    if (ok) {
      toast.success("ここまでの内容を保存しました");
    }
  }

  async function handleNext() {
    if (nextStepConfig && isStepBlocked(nextStepConfig.num)) {
      toast.error(
        creationMode === "simple"
          ? "販売受付へ進むには公演と席種を1件以上設定してください"
          : "Step3へ進むには公演を1件以上追加してください",
      );
      return;
    }

    const ok = await persistCurrentStep();
    if (!ok) {
      return;
    }

    if (!nextStepConfig) {
      toast.success(mode === "create" ? "イベントを作成して公開しました" : "設定を保存しました");
      if (draft.eventId) {
        await navigate({ to: "/events/$eventId", params: { eventId: draft.eventId } });
      }
      return;
    }

    setCurrentStep(nextStepConfig.num);
  }

  async function handleBack() {
    const ok = await persistCurrentStep();
    if (!ok) {
      return;
    }
    if (previousStepConfig) {
      setCurrentStep(previousStepConfig.num);
    }
  }

  // ステッパーからの直接ジャンプでも必ず現在のステップを保存してから移動する。
  // 未保存のまま他ステップへ移ると、そのステップでのみ存在するローカルIDが
  // 後続ステップ(受付・券の対象公演/席種など)から参照できず、保存時に無言で欠落するため。
  async function handleGoToStep(targetStep: number) {
    if (targetStep === currentStep) {
      return;
    }

    if (isStepBlocked(targetStep)) {
      toast.error(
        creationMode === "simple"
          ? "販売受付へ進むには公演と席種を1件以上設定してください"
          : "Step3へ進むには公演を1件以上追加してください",
      );
      return;
    }

    const ok = await persistCurrentStep();
    if (!ok) {
      return;
    }
    setCurrentStep(targetStep);
  }

  function handleRemoveSeatCategory(key: string) {
    const seatCategory = draft.seatCategories.find((item) => item.key === key);
    if (!seatCategory) {
      return;
    }

    if (seatCategory.id) {
      dispatch({ type: "UPDATE_SEAT_CATEGORY", key, patch: { active: false } });
    } else {
      dispatch({ type: "REMOVE_SEAT_CATEGORY", key });
    }
  }

  async function handleRemoveSaleWindow(key: string) {
    const saleWindow = draft.saleWindows.find((item) => item.key === key);
    if (!saleWindow) {
      return;
    }

    if (!saleWindow.id) {
      dispatch({ type: "REMOVE_SALE_WINDOW", key });
      return;
    }

    const cancelReason = window.prompt("キャンセル理由を入力してください");
    if (!cancelReason) {
      return;
    }

    try {
      await client.organizer.event.cancelSaleWindow({
        eventOrganizerId,
        eventId: draft.eventId ?? "",
        saleWindowId: saleWindow.id,
        cancelReason,
      });
      dispatch({
        type: "UPDATE_SALE_WINDOW",
        key,
        patch: { canceledAt: new Date().toISOString() },
      });
      toast.success("販売受付をキャンセルしました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "販売受付のキャンセルに失敗しました");
    }
  }

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
          {mode === "edit" && draft.eventId ? (
            <Link
              to="/events/$eventId"
              params={{ eventId: draft.eventId }}
              className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              ← イベント詳細へ戻る
            </Link>
          ) : (
            <Link
              to="/"
              className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              ← イベント一覧へ戻る
            </Link>
          )}
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {mode === "create" ? (
                  "新規作成"
                ) : (
                  <EventStatusBadge status={initialEvent?.status ?? "DRAFT"} />
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {mode === "create" ? "イベントを作成" : draft.name || "イベントを編集"}
              </h1>
              {mode === "create" && creationMode && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-full bg-foreground px-3 text-xs font-semibold text-background">
                    {creationMode === "simple" ? "簡単イベント作成" : "詳細イベント作成"}
                  </span>
                  {canChangeCreationMode && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      onClick={handleResetCreationMode}
                    >
                      作成方法を変更
                    </button>
                  )}
                </div>
              )}
            </div>
            {!isPickerVisible && (
              <Button type="button" variant="outline" disabled={isSaving} onClick={handleSaveDraft}>
                下書き保存
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        {isPickerVisible ? (
          <CreationModePicker onSelect={handleSelectCreationMode} />
        ) : (
          <div className="grid gap-14 md:grid-cols-[240px_1fr]">
            <EventWizardStepper
              currentStep={currentStep}
              onGoToStep={handleGoToStep}
              isStepDisabled={isStepBlocked}
              steps={steps}
            />

            <div className="min-w-0">
              <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight">{currentStepConfig?.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {currentStepConfig?.description}
                </p>
              </div>

              {currentStepConfig?.stepKey === "basic" && (
                <StepBasicInfo
                  draft={draft}
                  onChange={(patch) =>
                    dispatch({
                      type: "SET_BASIC_INFO",
                      name: patch.name ?? draft.name,
                      description: patch.description ?? draft.description,
                    })
                  }
                />
              )}

              {currentStepConfig?.stepKey === "performances" && (
                <StepPerformances
                  performances={draft.performances}
                  onAdd={() => dispatch({ type: "ADD_PERFORMANCE" })}
                  onUpdate={(key, patch) => dispatch({ type: "UPDATE_PERFORMANCE", key, patch })}
                  onRemove={(key) => dispatch({ type: "REMOVE_PERFORMANCE", key })}
                />
              )}

              {currentStepConfig?.stepKey === "simple-ticketing" && (
                <StepSimpleTicketing
                  performance={draft.performances[0]}
                  seatCategories={draft.seatCategories}
                  rateTypes={draft.rateTypes}
                  inventory={draft.inventory}
                  standardPrices={draft.standardPrices}
                  onUpdatePerformance={(key, patch) =>
                    dispatch({ type: "UPDATE_PERFORMANCE", key, patch })
                  }
                  onAddSeatCategory={() => dispatch({ type: "ADD_SEAT_CATEGORY" })}
                  onUpdateSeatCategory={(key, patch) =>
                    dispatch({ type: "UPDATE_SEAT_CATEGORY", key, patch })
                  }
                  onRemoveSeatCategory={handleRemoveSeatCategory}
                  onInventoryChange={(performanceKey, seatCategoryKey, capacity) =>
                    dispatch({
                      type: "SET_INVENTORY_CELL",
                      performanceKey,
                      seatCategoryKey,
                      capacity,
                    })
                  }
                  onPriceChange={(seatCategoryKey, rateTypeKey, price) =>
                    dispatch({ type: "SET_PRICE_CELL", seatCategoryKey, rateTypeKey, price })
                  }
                />
              )}

              {currentStepConfig?.stepKey === "seat-categories" && (
                <StepSeatCategories
                  seatCategories={draft.seatCategories}
                  performances={draft.performances}
                  inventory={draft.inventory}
                  onAdd={() => dispatch({ type: "ADD_SEAT_CATEGORY" })}
                  onUpdate={(key, patch) => dispatch({ type: "UPDATE_SEAT_CATEGORY", key, patch })}
                  onRemove={handleRemoveSeatCategory}
                  onInventoryChange={(performanceKey, seatCategoryKey, capacity) =>
                    dispatch({
                      type: "SET_INVENTORY_CELL",
                      performanceKey,
                      seatCategoryKey,
                      capacity,
                    })
                  }
                />
              )}

              {currentStepConfig?.stepKey === "rate-types" && (
                <StepRateTypes
                  rateTypes={draft.rateTypes}
                  seatCategories={draft.seatCategories}
                  standardPrices={draft.standardPrices}
                  onAdd={() => dispatch({ type: "ADD_RATE_TYPE" })}
                  onUpdate={(key, patch) => dispatch({ type: "UPDATE_RATE_TYPE", key, patch })}
                  onRemove={(key) => dispatch({ type: "REMOVE_RATE_TYPE", key })}
                  onPriceChange={(seatCategoryKey, rateTypeKey, price) =>
                    dispatch({ type: "SET_PRICE_CELL", seatCategoryKey, rateTypeKey, price })
                  }
                />
              )}

              {currentStepConfig?.stepKey === "sale-windows" && (
                <StepSaleWindows
                  saleWindows={draft.saleWindows}
                  performances={draft.performances}
                  seatCategories={activeSeatCategories}
                  rateTypes={draft.rateTypes}
                  standardPrices={draft.standardPrices}
                  allowPassOffers={creationMode !== "simple"}
                  onAdd={() => dispatch({ type: "ADD_SALE_WINDOW" })}
                  onUpdate={(key, patch) => dispatch({ type: "UPDATE_SALE_WINDOW", key, patch })}
                  onRemove={handleRemoveSaleWindow}
                  onAddOffer={(saleWindowKey, offer) =>
                    dispatch({ type: "ADD_OFFER", saleWindowKey, offer })
                  }
                  onUpdateOffer={(saleWindowKey, offer) =>
                    dispatch({ type: "UPDATE_OFFER", saleWindowKey, key: offer.key, patch: offer })
                  }
                  onRemoveOffer={(saleWindowKey, offerKey) =>
                    dispatch({ type: "REMOVE_OFFER", saleWindowKey, key: offerKey })
                  }
                />
              )}

              <div className="mt-10 flex items-center justify-between border-t pt-6">
                {previousStepConfig ? (
                  <Button type="button" variant="outline" disabled={isSaving} onClick={handleBack}>
                    戻る
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  type="button"
                  disabled={isNextDisabled}
                  title={
                    isNextDisabled && !hasPerformances ? "公演を追加すると次へ進めます" : undefined
                  }
                  onClick={handleNext}
                >
                  {isSaving
                    ? "保存中"
                    : nextStepConfig
                      ? "次へ"
                      : mode === "create"
                        ? "作成して公開"
                        : "保存する"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
