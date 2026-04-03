import { redirect } from "react-router";
import { useProfileStore } from "@/hooks/useProfile";
import { authClient } from "@/services/authClient";
import type { Profile } from "@/types/profile";

function syncAuthState(result: {
  authenticated: boolean;
  profile: unknown | null;
}) {
  useProfileStore.getState().setAuthenticated(result.authenticated);
  useProfileStore.getState().setProfile(result.profile as Profile | null);
}

export async function requireAuth() {
  const result = await authClient.getCurrentUser();
  syncAuthState(result);

  if (!result.authenticated || !result.user) {
    useProfileStore.getState().clearProfile();
    return redirect("/auth/login");
  }

  return { user: result.profile };
}

export async function adminLoader() {
  const result = await authClient.getCurrentUser();
  syncAuthState(result);

  if (!result.authenticated || !result.user || !result.isAdmin) {
    useProfileStore.getState().clearProfile();
    return redirect("/auth/login");
  }

  return { profile: result.profile };
}

