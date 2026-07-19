import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { to: "/", label: "主催者" },
    { to: "/sales", label: "月別売上" },
  ] as const;

  return (
    <header>
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="font-semibold text-foreground">
            平台管理
          </Link>
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="font-medium text-muted-foreground transition-colors [&.active]:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </header>
  );
}
