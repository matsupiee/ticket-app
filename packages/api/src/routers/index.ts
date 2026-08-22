import type { RouterClient } from "@orpc/server";

import { listApplicationsRoute } from "./fan/application/list/route";
import { submitApplicationRoute } from "./fan/application/submit/route";
import { eventGetRoute } from "./fan/event/get/route";
import { listEventsRoute as listFanEventsRoute } from "./fan/event/list/route";
import { listTicketsRoute } from "./fan/ticket/list/route";
import { useTicketRoute } from "./fan/ticket/use/route";
import { getProfileRoute } from "./fan/user/profile/get/route";
import { updateProfileRoute as updateFanProfileRoute } from "./fan/user/profile/update/route";
import { verifyPhoneRoute } from "./fan/user/verify-phone/confirm/route";
import { requestPhoneVerificationRoute } from "./fan/user/verify-phone/request/route";
import { inviteMemberRoute } from "./organizer/account/invite-member/route";
import { getMyOrganizerAccountRoute } from "./organizer/account/me/route";
import { removeMemberRoute } from "./organizer/account/remove-member/route";
import { signUpOrganizerAccountRoute } from "./organizer/account/sign-up/route";
import { updateMemberRoleRoute } from "./organizer/account/update-member-role/route";
import { updateProfileRoute as updateOrganizerProfileRoute } from "./organizer/account/update-profile/route";
import { upsertBankAccountRoute } from "./organizer/account/upsert-bank-account/route";
import { adjustInventoryRoute } from "./organizer/event/adjust-inventory/route";
import { cancelSaleWindowRoute } from "./organizer/event/cancel-sale-window/route";
import { createEventRoute } from "./organizer/event/create/route";
import { getEventRoute } from "./organizer/event/get/route";
import { listEventsRoute as listOrganizerEventsRoute } from "./organizer/event/list/route";
import { updateEventRoute } from "./organizer/event/update/route";
import { upsertPerformanceRoute } from "./organizer/event/upsert-performance/route";
import { upsertRateTypeRoute } from "./organizer/event/upsert-rate-type/route";
import { upsertSaleOfferRoute } from "./organizer/event/upsert-sale-offer/route";
import { upsertSaleWindowRoute } from "./organizer/event/upsert-sale-window/route";
import { upsertSeatCategoryRoute } from "./organizer/event/upsert-seat-category/route";
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
      get: eventGetRoute,
      list: listFanEventsRoute,
    },
    ticket: {
      list: listTicketsRoute,
      use: useTicketRoute,
    },
    user: {
      profile: {
        get: getProfileRoute,
        update: updateFanProfileRoute,
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
      updateProfile: updateOrganizerProfileRoute,
      upsertBankAccount: upsertBankAccountRoute,
    },
    event: {
      adjustInventory: adjustInventoryRoute,
      cancelSaleWindow: cancelSaleWindowRoute,
      create: createEventRoute,
      get: getEventRoute,
      list: listOrganizerEventsRoute,
      update: updateEventRoute,
      upsertPerformance: upsertPerformanceRoute,
      upsertRateType: upsertRateTypeRoute,
      upsertSaleOffer: upsertSaleOfferRoute,
      upsertSaleWindow: upsertSaleWindowRoute,
      upsertSeatCategory: upsertSeatCategoryRoute,
    },
  },
  platform: {
    organizer: {
      get: getOrganizerRoute,
      list: listOrganizersRoute,
      updateStatus: updateStatusRoute,
    },
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
