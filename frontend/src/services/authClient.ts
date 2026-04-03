import { clearAuthToken } from "@/lib/authToken";
import { apiClient } from "@/lib/apiClient";

export type AuthResult = {
  authenticated: boolean;
  user: unknown | null;
  profile: unknown | null;
};

export const authClient = {
  async getCurrentUser(): Promise<AuthResult> {
    try {
      const res = await apiClient.get("/api/auth/me", {
        withCredentials: true,
      });

      return {
        authenticated: true,
        user: res.data.user ?? null,
        profile: res.data.profile ?? res.data.user ?? null,
      };
    } catch {
      return { authenticated: false, user: null, profile: null };
    }
  },

  async checkIsAdmin(): Promise<boolean> {
    try {
      const res = await apiClient.get("/api/auth/me", {
        withCredentials: true,
      });
      const data = res.data ?? {};
      if (data.isAdmin === true) return true;

      const userRoles = Array.isArray(data.user?.roles) ? data.user.roles : [];

      return userRoles.includes("admin");
    } catch {
      return false;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/api/auth/logout", undefined, {
        withCredentials: true,
      });
    } catch {
      // Ignore logout errors in template
    } finally {
      clearAuthToken();
    }
  },
};
