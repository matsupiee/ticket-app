import { test as base } from "@playwright/test";

import { FanMyPage } from "../page-objects/fan/my-page";
import { FanSignInPage } from "../page-objects/fan/sign-in";
import { FanSignUpPage } from "../page-objects/fan/sign-up";
import { OrganizerDashboardPage } from "../page-objects/organizer/dashboard";
import { OrganizerForbiddenPage } from "../page-objects/organizer/forbidden";
import { OrganizerSignInPage } from "../page-objects/organizer/sign-in";
import { OrganizerSignUpPage } from "../page-objects/organizer/sign-up";
import { PlatformOrganizerListPage } from "../page-objects/platform/organizers";
import { PlatformSignInPage } from "../page-objects/platform/sign-in";
import { PlatformSignUpPage } from "../page-objects/platform/sign-up";
import { e2eEnv } from "../utils/env";

type App = {
  fan: {
    signIn: () => FanSignInPage;
    signUp: () => FanSignUpPage;
    myPage: () => FanMyPage;
  };
  organizer: {
    signIn: () => OrganizerSignInPage;
    signUp: () => OrganizerSignUpPage;
    dashboard: () => OrganizerDashboardPage;
    forbidden: () => OrganizerForbiddenPage;
  };
  platform: {
    signIn: () => PlatformSignInPage;
    signUp: () => PlatformSignUpPage;
    organizerList: () => PlatformOrganizerListPage;
  };
};

// 管理画面は baseURL（購入者向けweb）と別オリジンのため、Page Object へは fixture から baseUrl を渡す
export const test = base.extend<{ app: App }>({
  app: async ({ page }, use) => {
    const organizerAdminUrl = e2eEnv.organizerAdminUrl;
    const platformAdminUrl = e2eEnv.platformAdminUrl;

    await use({
      fan: {
        signIn: () => new FanSignInPage(page),
        signUp: () => new FanSignUpPage(page),
        myPage: () => new FanMyPage(page),
      },
      organizer: {
        signIn: () => new OrganizerSignInPage(page, organizerAdminUrl),
        signUp: () => new OrganizerSignUpPage(page, organizerAdminUrl),
        dashboard: () => new OrganizerDashboardPage(page, organizerAdminUrl),
        forbidden: () => new OrganizerForbiddenPage(page, organizerAdminUrl),
      },
      platform: {
        signIn: () => new PlatformSignInPage(page, platformAdminUrl),
        signUp: () => new PlatformSignUpPage(page, platformAdminUrl),
        organizerList: () => new PlatformOrganizerListPage(page, platformAdminUrl),
      },
    });
  },
});

export { expect } from "@playwright/test";
