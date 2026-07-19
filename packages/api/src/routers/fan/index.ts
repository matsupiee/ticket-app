import { listApplicationsRoute } from "./application/list";
import { submitApplicationRoute } from "./application/submit";
import { getEventRoute } from "./event/get";
import { listEventsRoute } from "./event/list";
import { quoteApplicationRoute } from "./event/quote-application";
import { listTicketsRoute } from "./ticket/list";
import { getProfileRoute } from "./user/profile/get";
import { updateProfileRoute } from "./user/profile/update";
import { verifyPhoneRoute } from "./user/verify-phone/confirm";
import { requestPhoneVerificationRoute } from "./user/verify-phone/request";

export const fanRouter = {
  application: {
    list: listApplicationsRoute,
    submit: submitApplicationRoute,
  },
  event: {
    get: getEventRoute,
    list: listEventsRoute,
    quoteApplication: quoteApplicationRoute,
  },
  ticket: {
    list: listTicketsRoute,
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
};
