import type { ReactNode } from "react";

export function AuthPanelLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="overflow-y-auto bg-background">
      <section className="mx-auto grid max-w-md gap-6 px-4 py-12 md:px-6">
        <div className="space-y-3 text-center">
          <p className="text-xs font-medium text-muted-foreground">platform auth</p>
          <h1 className="text-3xl font-semibold tracking-normal">{title}</h1>
          <p className="text-sm leading-7 text-muted-foreground">{description}</p>
        </div>

        {children}

        <div className="grid gap-2 text-center">{footer}</div>
      </section>
    </main>
  );
}
