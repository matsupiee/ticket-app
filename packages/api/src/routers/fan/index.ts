import { listApplicationsRoute } from "./application/list/route";
import { submitApplicationRoute } from "./application/submit/route";
import { getEventRoute } from "./event/get/route";
import { listEventsRoute } from "./event/list/route";
import { quoteApplicationRoute } from "./event/quote-application/route";
import { listTicketsRoute } from "./ticket/list/route";
import { privateDataRoute } from "./user/private-data/route";
import { getProfileRoute } from "./user/profile/get/route";
import { updateProfileRoute } from "./user/profile/update/route";
import { verifyPhoneRoute } from "./user/verify-phone/confirm/route";
import { requestPhoneVerificationRoute } from "./user/verify-phone/request/route";

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
    privateData: privateDataRoute,
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
