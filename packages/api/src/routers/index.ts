import type { RouterClient } from "@orpc/server";

import { applicationListRoute } from "./fan/application/list/route";
import { applicationSubmitRoute } from "./fan/application/submit/route";
import { eventGetRoute as fanEventGetRoute } from "./fan/event/get/route";
import { eventListRoute as fanEventListRoute } from "./fan/event/list/route";
import { ticketListRoute } from "./fan/ticket/list/route";
import { ticketUseRoute } from "./fan/ticket/use/route";
import { userProfileGetRoute } from "./fan/user/profile/get/route";
import { userProfileUpdateRoute } from "./fan/user/profile/update/route";
import { userVerifyPhoneConfirmRoute } from "./fan/user/verify-phone/confirm/route";
import { userVerifyPhoneRequestRoute } from "./fan/user/verify-phone/request/route";
import { accountInviteMemberRoute } from "./organizer/account/invite-member/route";
import { accountMeRoute } from "./organizer/account/me/route";
import { accountRemoveMemberRoute } from "./organizer/account/remove-member/route";
import { accountSignUpRoute } from "./organizer/account/sign-up/route";
import { accountUpdateMemberRoleRoute } from "./organizer/account/update-member-role/route";
import { accountUpdateProfileRoute } from "./organizer/account/update-profile/route";
import { accountUpsertBankAccountRoute } from "./organizer/account/upsert-bank-account/route";
import { eventCreateRoute } from "./organizer/event/create/route";
import { eventEditBasicInfoRoute } from "./organizer/event/edit-basic-info/route";
import { eventEditSalesSettingRoute } from "./organizer/event/edit-sales-setting/route";
import { eventGetRoute as organizerEventGetRoute } from "./organizer/event/get/route";
import { eventListRoute as organizerEventListRoute } from "./organizer/event/list/route";
import { organizerGetRoute } from "./platform/organizer/get/route";
import { organizerListRoute } from "./platform/organizer/list/route";
import { organizerUpdateStatusRoute } from "./platform/organizer/update-status/route";

export const appRouter = {
  fan: {
    application: {
      list: applicationListRoute,
      submit: applicationSubmitRoute,
    },
    event: {
      get: fanEventGetRoute,
      list: fanEventListRoute,
    },
    ticket: {
      list: ticketListRoute,
      use: ticketUseRoute,
    },
    user: {
      profile: {
        get: userProfileGetRoute,
        update: userProfileUpdateRoute,
      },
      verifyPhone: {
        request: userVerifyPhoneRequestRoute,
        confirm: userVerifyPhoneConfirmRoute,
      },
    },
  },
  organizer: {
    account: {
      inviteMember: accountInviteMemberRoute,
      me: accountMeRoute,
      removeMember: accountRemoveMemberRoute,
      signUp: accountSignUpRoute,
      updateMemberRole: accountUpdateMemberRoleRoute,
      updateProfile: accountUpdateProfileRoute,
      upsertBankAccount: accountUpsertBankAccountRoute,
    },
    event: {
      create: eventCreateRoute,
      editBasicInfo: eventEditBasicInfoRoute,
      editSalesSetting: eventEditSalesSettingRoute,
      get: organizerEventGetRoute,
      list: organizerEventListRoute,
    },
  },
  platform: {
    organizer: {
      get: organizerGetRoute,
      list: organizerListRoute,
      updateStatus: organizerUpdateStatusRoute,
    },
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
