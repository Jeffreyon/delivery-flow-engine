import { useEffect, useState } from "react";
import { LoadErrorCard } from "@/components/common/LoadErrorCard";
import {
  fetchAuthMe,
  fetchUser,
  type UserProfile,
} from "@/services/dashboard.api";

export default function AccountPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        setLoading(true);
        setError(null);
      }

      try {
        const me = await fetchAuthMe();
        const user = await fetchUser(me.uid);
        if (!active) return;
        setProfile(user);
      } catch {
        if (!active) return;
        setError("Account details could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-28 rounded-md bg-muted/60 animate-pulse" />
          <div className="h-3 w-64 rounded-md bg-muted/40 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-3">
            <div className="h-3 w-24 rounded-md bg-muted/60" />
            <div className="h-3 w-40 rounded-md bg-muted/40" />
            <div className="h-3 w-32 rounded-md bg-muted/40" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <LoadErrorCard
        title="Could not load account details"
        description={error}
        onAction={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  if (!profile) {
    return (
      <LoadErrorCard
        title="Profile unavailable"
        description="The account record was not returned for this session."
        onAction={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Account</h2>
        <p className="text-sm text-muted-foreground">
          Basic information about your account.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Profile</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{profile.email}</dd>
            </div>
            {profile.displayName && (
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{profile.displayName}</dd>
              </div>
            )}
            {Array.isArray(profile.roles) && profile.roles.length > 0 && (
              <div>
                <dt className="text-muted-foreground">Roles</dt>
                <dd className="font-medium">{profile.roles.join(", ")}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}

