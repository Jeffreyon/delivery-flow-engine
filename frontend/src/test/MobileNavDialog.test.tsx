import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { MobileNavDialog } from "@/components/layout/MobileNavDialog";

describe("MobileNavDialog", () => {
  it("opens the mobile navigation dialog and shows nav items", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <MobileNavDialog
          title="Workspace navigation"
          description="Move between account views."
          homeHref="/dashboard"
          brandLabel="Workspace"
          profilePrimary="Test User"
          profileSecondary="user@example.com"
          navItems={[
            {
              to: "/dashboard",
              label: "Overview",
              icon: <span aria-hidden="true">O</span>,
              end: true,
            },
            {
              to: "/dashboard/security",
              label: "Security",
              icon: <span aria-hidden="true">S</span>,
            },
          ]}
          loggingOut={false}
          onLogout={vi.fn()}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));

    expect(screen.getByText("Workspace navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("runs the logout action from the dialog", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <MobileNavDialog
          title="Workspace navigation"
          description="Move between account views."
          homeHref="/dashboard"
          brandLabel="Workspace"
          navItems={[
            {
              to: "/dashboard",
              label: "Overview",
              icon: <span aria-hidden="true">O</span>,
              end: true,
            },
          ]}
          loggingOut={false}
          onLogout={onLogout}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
