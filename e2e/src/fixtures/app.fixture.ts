import { test as base } from "@playwright/test";

import { PlatformOrganizerListPage } from "../page-objects/platform/organizers";
import { PlatformSignInPage } from "../page-objects/platform/sign-in";
import { PlatformSignUpPage } from "../page-objects/platform/sign-up";
import { e2eEnv } from "../utils/env";

type App = {
  platform: {
    signIn: () => PlatformSignInPage;
    signUp: () => PlatformSignUpPage;
    organizerList: () => PlatformOrganizerListPage;
  };
};

// 管理画面は baseURL（購入者向けweb）と別オリジンのため、Page Object へは fixture から baseUrl を渡す
export const test = base.extend<{ app: App }>({
  app: async ({ page }, use) => {
    const platformAdminUrl = e2eEnv.platformAdminUrl;

    await use({
      platform: {
        signIn: () => new PlatformSignInPage(page, platformAdminUrl),
        signUp: () => new PlatformSignUpPage(page, platformAdminUrl),
        organizerList: () => new PlatformOrganizerListPage(page, platformAdminUrl),
      },
    });
  },
});

export { expect } from "@playwright/test";
