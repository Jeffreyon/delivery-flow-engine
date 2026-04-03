import { useEffect, useState } from "react";
import { LoadErrorCard } from "@/components/common/LoadErrorCard";
import { fetchDeliveryEvents, type DeliveryEventItem } from "@/services/admin.api";

export default function AdminEventsPage() {
  const [deliveryEvents, setDeliveryEvents] = useState<DeliveryEventItem[]>([]);
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
        const data = await fetchDeliveryEvents();
        if (!active) return;
        setDeliveryEvents(data);
      } catch {
        if (!active) return;
        setError("Delivery event records could not be loaded.");
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
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-28 rounded-md bg-muted/60 animate-pulse" />
          <div className="h-3 w-80 rounded-md bg-muted/40 animate-pulse" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-2">
          <div className="h-3 w-full rounded-md bg-muted/40" />
          <div className="h-3 w-11/12 rounded-md bg-muted/40" />
          <div className="h-3 w-10/12 rounded-md bg-muted/40" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <LoadErrorCard
        title="Could not load delivery events"
        description={error}
        onAction={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Delivery events</h2>
        <p className="text-sm text-muted-foreground">
          Recent delivery event records and operational history.
        </p>
      </div>

      {deliveryEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
          No delivery events have been recorded yet.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/60">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {deliveryEvents.map((evt) => (
                <tr
                  key={evt.id}
                  className="border-t border-border/60 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-2 align-top">
                    <span className="text-xs font-medium">{evt.type}</span>
                  </td>
                  <td className="px-4 py-2 align-top text-xs text-muted-foreground">
                    {evt.createdAt
                      ? new Date(evt.createdAt).toLocaleString()
                      : "Unknown"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
