import type { RouterClient } from "@orpc/server";

import { listApplicationsRoute } from "./fan/application/list/route";
import { submitApplicationRoute } from "./fan/application/submit/route";
import { listTicketsRoute } from "./fan/ticket/list/route";
import { useTicketRoute } from "./fan/ticket/use/route";
import { getProfileRoute } from "./fan/user/profile/get/route";
import { verifyPhoneRoute } from "./fan/user/verify-phone/confirm/route";
import { requestPhoneVerificationRoute } from "./fan/user/verify-phone/request/route";
import { updateProfileRoute } from "./organizer/account/update-profile/route";
import { getEventRoute } from "./organizer/event/get/route";
import { listEventsRoute } from "./organizer/event/list/route";
import { inviteMemberRoute } from "./organizer/account/invite-member/route";
import { getMyOrganizerAccountRoute } from "./organizer/account/me/route";
import { removeMemberRoute } from "./organizer/account/remove-member/route";
import { signUpOrganizerAccountRoute } from "./organizer/account/sign-up/route";
import { updateMemberRoleRoute } from "./organizer/account/update-member-role/route";
import { upsertBankAccountRoute } from "./organizer/account/upsert-bank-account/route";
import { adjustInventoryRoute } from "./organizer/event/adjust-inventory/route";
import { cancelSaleWindowRoute } from "./organizer/event/cancel-sale-window/route";
import { createEventRoute } from "./organizer/event/create/route";
import { disableFeeRuleRoute } from "./organizer/event/disable-fee-rule/route";
import { updateEventRoute } from "./organizer/event/update/route";
import { upsertFeeRuleRoute } from "./organizer/event/upsert-fee-rule/route";
import { upsertPerformanceRoute } from "./organizer/event/upsert-performance/route";
import { upsertRateTypeRoute } from "./organizer/event/upsert-rate-type/route";
import { upsertSaleOfferRoute } from "./organizer/event/upsert-sale-offer/route";
import { upsertSaleWindowRoute } from "./organizer/event/upsert-sale-window/route";
import { upsertSeatCategoryRoute } from "./organizer/event/upsert-seat-category/route";
import { getMyPlatformAccountRoute } from "./platform/account/me/route";
import { getOrganizerRoute } from "./platform/organizer/get/route";
import { listOrganizersRoute } from "./platform/organizer/list/route";
import { updateStatusRoute } from "./platform/organizer/update-status/route";

export const appRouter = {
  fan: {
    application: {
      list: listApplicationsRoute,
      submit: submitApplicationRoute,
    },
    event: {
      get: getEventRoute,
      list: listEventsRoute,
    },
    ticket: {
      list: listTicketsRoute,
      use: useTicketRoute,
    },
    user: {
      profile: {
        get: getProfileRoute,
        update: updateProfileRoute,
      },
      verifyPhone: {
        request: requestPhoneVerificationRoute,
        confirm: verifyPhoneRoute,
      },
    },
  },
  organizer: {
    account: {
      inviteMember: inviteMemberRoute,
      me: getMyOrganizerAccountRoute,
      removeMember: removeMemberRoute,
      signUp: signUpOrganizerAccountRoute,
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
  },
  platform: {
    account: {
      me: getMyPlatformAccountRoute,
    },
    organizer: {
      get: getOrganizerRoute,
      list: listOrganizersRoute,
      updateStatus: updateStatusRoute,
    },
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
