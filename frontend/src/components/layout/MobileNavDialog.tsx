import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type MobileNavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
};

type MobileNavDialogProps = {
  title: string;
  description: string;
  homeHref: string;
  brandLabel: string;
  profilePrimary?: string | null;
  profileSecondary?: string | null;
  profileMeta?: string | null;
  navItems: MobileNavItem[];
  loggingOut: boolean;
  onLogout: () => Promise<void> | void;
};

export function MobileNavDialog({
  title,
  description,
  homeHref,
  brandLabel,
  profilePrimary,
  profileSecondary,
  profileMeta,
  navItems,
  loggingOut,
  onLogout,
}: MobileNavDialogProps) {
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    try {
      await onLogout();
    } finally {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted/60 md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
          <span>Menu</span>
        </button>
      </DialogTrigger>

      <DialogContent className="left-4 right-4 top-4 bottom-4 w-auto max-w-none translate-x-0 translate-y-0 p-0">
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                to={homeHref}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-3 text-sm font-semibold"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary shadow-xs overflow-hidden">
                  <img
                    src="/bkyd%20gem.png"
                    alt="Logo"
                    className="h-6 w-6 rounded-full object-cover"
                  />
                </span>
                <span className="tracking-wide uppercase text-xs text-muted-foreground">
                  {brandLabel}
                </span>
              </Link>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-muted/60"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <DialogHeader className="mb-0 mt-4">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 rounded-lg border px-3 py-3 text-sm transition-colors",
                      isActive
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    ].join(" ")
                  }
                >
                  <span className="text-sidebar-foreground/70">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {(profilePrimary || profileSecondary || profileMeta) && (
              <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                {profilePrimary && (
                  <div className="font-medium text-foreground">{profilePrimary}</div>
                )}
                {profileSecondary && (
                  <div className="truncate text-xs text-muted-foreground">
                    {profileSecondary}
                  </div>
                )}
                {profileMeta && (
                  <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {profileMeta}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border px-4 py-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-background text-sm font-medium text-foreground transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
            >
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
