import { getAccountRoute } from "./account/get";
import { inviteMemberRoute } from "./account/invite-member";
import { removeMemberRoute } from "./account/remove-member";
import { updateMemberRoleRoute } from "./account/update-member-role";
import { updateProfileRoute } from "./account/update-profile";
import { upsertBankAccountRoute } from "./account/upsert-bank-account";
import { adjustInventoryRoute } from "./event/adjust-inventory";
import { cancelSaleWindowRoute } from "./event/cancel-sale-window";
import { createEventRoute } from "./event/create";
import { disableFeeRuleRoute } from "./event/disable-fee-rule";
import { getEventRoute } from "./event/get";
import { listEventsRoute } from "./event/list";
import { updateEventRoute } from "./event/update";
import { upsertFeeRuleRoute } from "./event/upsert-fee-rule";
import { upsertPerformanceRoute } from "./event/upsert-performance";
import { upsertRateTypeRoute } from "./event/upsert-rate-type";
import { upsertSaleOfferRoute } from "./event/upsert-sale-offer";
import { upsertSaleWindowRoute } from "./event/upsert-sale-window";
import { upsertSeatCategoryRoute } from "./event/upsert-seat-category";
import { getDashboardRoute } from "./sales/get-dashboard";
import { listSettlementsRoute } from "./settlement/list";

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
