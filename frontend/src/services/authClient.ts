import { clearAuthToken } from "@/lib/authToken";
import { apiClient } from "@/lib/apiClient";

export type AuthResult = {
  authenticated: boolean;
  user: unknown | null;
  profile: unknown | null;
  isAdmin: boolean;
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
        isAdmin: res.data.isAdmin === true,
      };
    } catch {
      return {
        authenticated: false,
        user: null,
        profile: null,
        isAdmin: false,
      };
    }
  },

  async checkIsAdmin(): Promise<boolean> {
    const result = await authClient.getCurrentUser();
    return result.isAdmin;
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
