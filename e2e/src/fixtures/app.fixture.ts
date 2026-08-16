import { test as base } from "@playwright/test";

import { PlatformDashboardPage } from "../page-objects/platform/dashboard";
import { PlatformForbiddenPage } from "../page-objects/platform/forbidden";
import { PlatformSignInPage } from "../page-objects/platform/sign-in";
import { PlatformSignUpPage } from "../page-objects/platform/sign-up";

type App = {
  platform: {
    signIn: () => PlatformSignInPage;
    signUp: () => PlatformSignUpPage;
    dashboard: () => PlatformDashboardPage;
    forbidden: () => PlatformForbiddenPage;
  };
};

export const test = base.extend<{ app: App }>({
  app: async ({ page }, use) => {
    await use({
      platform: {
        signIn: () => new PlatformSignInPage(page),
        signUp: () => new PlatformSignUpPage(page),
        dashboard: () => new PlatformDashboardPage(page),
        forbidden: () => new PlatformForbiddenPage(page),
      },
    });
  },
});

export { expect } from "@playwright/test";
