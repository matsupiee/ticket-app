import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { toast } from "sonner";

import type { GetEventOutput } from "@ticket-app/api/routers/organizer/event/get/route";

import { client } from "@/lib/orpc";

import { EventWizardStepper, WIZARD_STEPS } from "./event-wizard-stepper";
import { StepBasicInfo } from "./step-basic-info";
import { StepPerformances } from "./step-performances";
import { StepRateTypes } from "./step-rate-types";
import { StepSaleWindows } from "./step-sale-windows";
import { StepSeatCategories } from "./step-seat-categories";
import { useEventWizardDraft } from "./use-event-wizard-draft";
import { EventStatusBadge } from "../status-badge";

const STEP_DESCRIPTIONS: Record<number, string> = {
  1: "イベント名と説明を入力します。",
  2: "公演ごとに会場と日程を登録します。ツアーは公演を複数追加します。",
  3: "席種を定義し、公演ごとの在庫数を設定します。",
  4: "料金種別を定義し、席種ごとの標準価格を設定します。",
  5: "受付ごとに販売する券を1件ずつ登録します。価格は標準価格から引き継ぎ、受付・公演ごとに変更できます。",
};

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
  const { draft, dispatch, saveStep } = useEventWizardDraft({
    mode,
    eventOrganizerId,
    initialEvent,
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const activeSeatCategories = draft.seatCategories.filter((seatCategory) => seatCategory.active);

  async function persistCurrentStep() {
    setIsSaving(true);
    try {
      await saveStep(currentStep);
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
    const ok = await persistCurrentStep();
    if (!ok) {
      return;
    }

    if (currentStep >= WIZARD_STEPS.length) {
      toast.success(mode === "create" ? "イベントを作成して公開しました" : "設定を保存しました");
      if (draft.eventId) {
        await navigate({ to: "/events/$eventId", params: { eventId: draft.eventId } });
      }
      return;
    }

    setCurrentStep((step) => step + 1);
  }

  async function handleBack() {
    const ok = await persistCurrentStep();
    if (!ok) {
      return;
    }
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  // ステッパーからの直接ジャンプでも必ず現在のステップを保存してから移動する。
  // 未保存のまま他ステップへ移ると、そのステップでのみ存在するローカルIDが
  // 後続ステップ(受付・券の対象公演/席種など)から参照できず、保存時に無言で欠落するため。
  async function handleGoToStep(targetStep: number) {
    if (targetStep === currentStep) {
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

  const currentStepConfig = WIZARD_STEPS[currentStep - 1];

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
          <Link
            to="/"
            className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            ← イベント一覧へ戻る
          </Link>
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
            </div>
            <Button type="button" variant="outline" disabled={isSaving} onClick={handleSaveDraft}>
              下書き保存
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="grid gap-14 md:grid-cols-[240px_1fr]">
          <EventWizardStepper currentStep={currentStep} onGoToStep={handleGoToStep} />

          <div className="min-w-0">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight">{currentStepConfig?.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {STEP_DESCRIPTIONS[currentStep]}
              </p>
            </div>

            {currentStep === 1 && (
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

            {currentStep === 2 && (
              <StepPerformances
                performances={draft.performances}
                onAdd={() => dispatch({ type: "ADD_PERFORMANCE" })}
                onUpdate={(key, patch) => dispatch({ type: "UPDATE_PERFORMANCE", key, patch })}
                onRemove={(key) => dispatch({ type: "REMOVE_PERFORMANCE", key })}
              />
            )}

            {currentStep === 3 && (
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

            {currentStep === 4 && (
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

            {currentStep === 5 && (
              <StepSaleWindows
                saleWindows={draft.saleWindows}
                performances={draft.performances}
                seatCategories={activeSeatCategories}
                rateTypes={draft.rateTypes}
                standardPrices={draft.standardPrices}
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
              {currentStep > 1 ? (
                <Button type="button" variant="outline" disabled={isSaving} onClick={handleBack}>
                  戻る
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" disabled={isSaving} onClick={handleNext}>
                {isSaving ? "保存中" : currentStep >= WIZARD_STEPS.length ? "作成して公開" : "次へ"}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
