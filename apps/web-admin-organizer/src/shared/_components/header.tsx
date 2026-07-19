import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { to: "/", label: "イベント" },
    { to: "/sales", label: "売上" },
    { to: "/settlements", label: "精算" },
    { to: "/settings", label: "設定" },
  ] as const;

  return (
    <header>
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="font-semibold text-foreground">
            主催者管理
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
