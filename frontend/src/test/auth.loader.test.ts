import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProfileStore } from "@/hooks/useProfile";
import { adminLoader, requireAuth } from "@/scripts/auth.loader";
import { authClient } from "@/services/authClient";

vi.mock("@/services/authClient", () => ({
  authClient: {
    getCurrentUser: vi.fn(),
    checkIsAdmin: vi.fn(),
  },
}));

describe("auth loaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProfileStore.getState().clearProfile();
  });

  it("hydrates admin state with a single current-user request", async () => {
    const profile = { id: "admin-1", email: "admin@example.com" };

    vi.mocked(authClient.getCurrentUser).mockResolvedValue({
      authenticated: true,
      user: profile,
      profile,
      isAdmin: true,
    });

    const result = await adminLoader();

    expect(authClient.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ profile });
    expect(useProfileStore.getState().authenticated).toBe(true);
    expect(useProfileStore.getState().profile).toEqual(profile);
  });

  it("redirects and clears state when auth is missing", async () => {
    useProfileStore.getState().setAuthenticated(true);
    useProfileStore.getState().setProfile({ id: "user-1" } as never);

    vi.mocked(authClient.getCurrentUser).mockResolvedValue({
      authenticated: false,
      user: null,
      profile: null,
      isAdmin: false,
    });

    const result = await requireAuth();

    expect(result).toBeInstanceOf(Response);
    if (!(result instanceof Response)) {
      throw new Error("Expected a redirect response");
    }

    expect(result.headers.get("Location")).toBe("/auth/login");
    expect(useProfileStore.getState().authenticated).toBe(false);
    expect(useProfileStore.getState().profile).toBeNull();
  });

  it("redirects authenticated non-admin users away from admin routes", async () => {
    const profile = { id: "user-1", email: "user@example.com" };

    vi.mocked(authClient.getCurrentUser).mockResolvedValue({
      authenticated: true,
      user: profile,
      profile,
      isAdmin: false,
    });

    const result = await adminLoader();

    expect(result).toBeInstanceOf(Response);
    if (!(result instanceof Response)) {
      throw new Error("Expected a redirect response");
    }

    expect(result.headers.get("Location")).toBe("/auth/login");
    expect(useProfileStore.getState().authenticated).toBe(false);
    expect(useProfileStore.getState().profile).toBeNull();
  });
});
