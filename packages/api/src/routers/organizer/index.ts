import { getAccountRoute } from "./account/get/route";
import { inviteMemberRoute } from "./account/invite-member/route";
import { removeMemberRoute } from "./account/remove-member/route";
import { updateMemberRoleRoute } from "./account/update-member-role/route";
import { updateProfileRoute } from "./account/update-profile/route";
import { upsertBankAccountRoute } from "./account/upsert-bank-account/route";
import { adjustInventoryRoute } from "./event/adjust-inventory/route";
import { cancelSaleWindowRoute } from "./event/cancel-sale-window/route";
import { createEventRoute } from "./event/create/route";
import { disableFeeRuleRoute } from "./event/disable-fee-rule/route";
import { getEventRoute } from "./event/get/route";
import { listEventsRoute } from "./event/list/route";
import { updateEventRoute } from "./event/update/route";
import { upsertFeeRuleRoute } from "./event/upsert-fee-rule/route";
import { upsertPerformanceRoute } from "./event/upsert-performance/route";
import { upsertRateTypeRoute } from "./event/upsert-rate-type/route";
import { upsertSaleOfferRoute } from "./event/upsert-sale-offer/route";
import { upsertSaleWindowRoute } from "./event/upsert-sale-window/route";
import { upsertSeatCategoryRoute } from "./event/upsert-seat-category/route";
import { getDashboardRoute } from "./sales/get-dashboard/route";
import { listSettlementsRoute } from "./settlement/list/route";

export const organizerRouter = {
  account: {
    get: getAccountRoute,
    inviteMember: inviteMemberRoute,
    removeMember: removeMemberRoute,
    updateMemberRole: updateMemberRoleRoute,
    updateProfile: updateProfileRoute,
    upsertBankAccount: upsertBankAccountRoute,
  },
  event: {
    adjustInventory: adjustInventoryRoute,
    cancelSaleWindow: cancelSaleWindowRoute,
    create: createEventRoute,
    disableFeeRule: disableFeeRuleRoute,
    get: getEventRoute,
    list: listEventsRoute,
    update: updateEventRoute,
    upsertFeeRule: upsertFeeRuleRoute,
    upsertPerformance: upsertPerformanceRoute,
    upsertRateType: upsertRateTypeRoute,
    upsertSaleOffer: upsertSaleOfferRoute,
    upsertSaleWindow: upsertSaleWindowRoute,
    upsertSeatCategory: upsertSeatCategoryRoute,
  },
  sales: {
    getDashboard: getDashboardRoute,
  },
  settlement: {
    list: listSettlementsRoute,
  },
};
