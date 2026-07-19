import { HeadContent, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@ticket-app/ui/components/sonner";

import Header from "@/shared/_components/header";
import { ThemeProvider } from "@/shared/_components/theme-provider";

import "../index.css";

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "ticket-app platform admin",
      },
      {
        name: "description",
        content: "ticket-app platform admin",
      },
    ],
  }),
});

function RootComponent() {
  const showDevtools = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEVTOOLS === "true";

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="ticket-app-platform-theme"
      >
        <div className="grid min-h-svh grid-rows-[auto_1fr]">
          <Header />
          <Outlet />
        </div>
        <Toaster richColors />
      </ThemeProvider>
      {showDevtools ? <TanStackRouterDevtools position="bottom-left" /> : null}
    </>
  );
}
