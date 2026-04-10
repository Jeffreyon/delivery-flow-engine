import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LoadErrorCard } from "@/components/common/LoadErrorCard";
import {
  fetchNetworkContext,
  type NetworkContextResponse,
} from "@/services/network.api";
import {
  fetchRemoteDeliveries,
  fetchRemoteDelivery,
  fetchRemoteDeliveryEvents,
  fetchRemoteHandoffStatus,
  fetchRemoteHandoffs,
  type RemoteDeliveriesResponse,
  type RemoteDelivery,
  type RemoteDeliveryEvent,
  type RemoteHandoff,
  type RemoteHandoffStatus,
} from "@/services/operations.api";

const STATUS_FILTERS = [
  "ALL",
  "CREATED",
  "DISPATCHED",
  "IN_TRANSIT",
  "DISPUTED",
  "DELIVERED",
  "FAILED",
] as const;

type DeliveryFilter = (typeof STATUS_FILTERS)[number];

type DetailState = {
  delivery: RemoteDelivery | null;
  events: RemoteDeliveryEvent[];
  handoffStatus: RemoteHandoffStatus | null;
  handoffs: RemoteHandoff[];
};

const emptyDetailState: DetailState = {
  delivery: null,
  events: [],
  handoffStatus: null,
  handoffs: [],
};

function formatTimestamp(value?: number | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString();
}

function getStatusTone(status: string) {
  switch (String(status || "").toUpperCase()) {
    case "DELIVERED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
    case "IN_TRANSIT":
      return "border-sky-500/30 bg-sky-500/10 text-sky-100";
    case "DISPUTED":
    case "FAILED":
      return "border-rose-500/30 bg-rose-500/10 text-rose-100";
    case "REQUESTED":
      return "border-amber-500/30 bg-amber-500/10 text-amber-100";
    default:
      return "border-border bg-background/50 text-foreground";
  }
}

function buildSummary(deliveries: RemoteDelivery[]) {
  return {
    total: deliveries.length,
    inTransit: deliveries.filter((item) => item.status === "IN_TRANSIT").length,
    delivered: deliveries.filter((item) => item.status === "DELIVERED").length,
    disputed: deliveries.filter((item) => item.status === "DISPUTED").length,
  };
}

export default function OperationsWorkspacePage() {
  const [networkContext, setNetworkContext] = useState<NetworkContextResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [filter, setFilter] = useState<DeliveryFilter>("ALL");
  const [deliveriesState, setDeliveriesState] = useState<RemoteDeliveriesResponse>({
    items: [],
    nextCursor: null,
  });
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<DetailState>(emptyDetailState);
  const [reloadKey, setReloadKey] = useState(0);

  const hasNodeContext = Boolean(networkContext?.effectiveContext?.nodeId);
  const primaryIssue = networkContext?.issues?.[0] || null;
  const summary = useMemo(
    () => buildSummary(deliveriesState.items),
    [deliveriesState.items]
  );

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      setDeliveriesState({ items: [], nextCursor: null });
      setSelectedDeliveryId(null);
      setDetailState(emptyDetailState);

      try {
        const context = await fetchNetworkContext();
        if (!active) return;

        setNetworkContext(context);

        if (!context?.effectiveContext?.nodeId) {
          return;
        }

        const deliveries = await fetchRemoteDeliveries({
          status: filter === "ALL" ? undefined : filter,
          limit: 12,
        });

        if (!active) return;

        setDeliveriesState(deliveries);
        setSelectedDeliveryId((current) => {
          if (current && deliveries.items.some((item) => item.id === current)) {
            return current;
          }

          return deliveries.items[0]?.id || null;
        });
      } catch {
        if (!active) return;
        setError(
          "Operations data could not be loaded right now. Check the BLN bridge and try again."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [filter, reloadKey]);

  useEffect(() => {
    if (!selectedDeliveryId || !hasNodeContext) {
      setDetailState(emptyDetailState);
      setDetailError(null);
      return;
    }

    let active = true;

    (async () => {
      setLoadingDetail(true);
      setDetailError(null);

      try {
        const [delivery, events, handoffStatus, handoffs] = await Promise.all([
          fetchRemoteDelivery(selectedDeliveryId),
          fetchRemoteDeliveryEvents(selectedDeliveryId),
          fetchRemoteHandoffStatus(selectedDeliveryId),
          fetchRemoteHandoffs(selectedDeliveryId),
        ]);

        if (!active) return;

        setDetailState({
          delivery,
          events,
          handoffStatus,
          handoffs: handoffs.items || [],
        });
      } catch {
        if (!active) return;
        setDetailError(
          "The selected delivery could not be loaded. Try refreshing the workspace."
        );
      } finally {
        if (active) {
          setLoadingDetail(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [detailReloadKey, hasNodeContext, selectedDeliveryId]);

  async function loadMore() {
    if (!deliveriesState.nextCursor) {
      return;
    }

    setLoadingMore(true);
    try {
      const nextPage = await fetchRemoteDeliveries({
        status: filter === "ALL" ? undefined : filter,
        limit: 12,
        cursor: deliveriesState.nextCursor,
      });

      setDeliveriesState((current) => ({
        items: [...current.items, ...(nextPage.items || [])],
        nextCursor: nextPage.nextCursor || null,
      }));
    } catch {
      setError(
        "More deliveries could not be loaded right now. Refresh the workspace and try again."
      );
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-3"
            >
              <div className="h-3 w-24 rounded-md bg-muted/60" />
              <div className="h-6 w-16 rounded-md bg-muted/40" />
            </div>
          ))}
        </section>
        <section className="grid gap-4 xl:grid-cols-[360px,1fr]">
          <div className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-3">
            <div className="h-4 w-32 rounded-md bg-muted/60" />
            <div className="h-20 rounded-lg bg-muted/40" />
            <div className="h-20 rounded-lg bg-muted/40" />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-3">
            <div className="h-4 w-40 rounded-md bg-muted/60" />
            <div className="h-24 rounded-lg bg-muted/40" />
            <div className="h-24 rounded-lg bg-muted/40" />
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <LoadErrorCard
        title="Could not load operations"
        description={error}
        onAction={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  if (!hasNodeContext) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Operations access is not ready</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {primaryIssue?.message ||
              "This account does not have an active BLN node yet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/dashboard/workspace"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Finish workspace setup
          </Link>
          <span className="text-xs text-muted-foreground">
            Operator deliveries and custody views unlock after node activation.
          </span>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Operations workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review BLN-backed deliveries, custody state, and transport activity
            for the current workspace without taking ownership away from the
            network backend.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Tenant: {networkContext?.effectiveContext?.tenantId || "Not assigned"} ·
            Node: {networkContext?.effectiveContext?.nodeId || "Not assigned"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/40"
        >
          Refresh workspace
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Visible deliveries" value={summary.total} />
        <SummaryCard label="In transit" value={summary.inTransit} />
        <SummaryCard label="Delivered" value={summary.delivered} />
        <SummaryCard label="Disputed" value={summary.disputed} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px,1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((status) => {
                const active = filter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilter(status)}
                    className={[
                      "rounded-md px-3 py-1.5 text-xs font-medium transition",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-foreground hover:bg-muted/40",
                    ].join(" ")}
                  >
                    {status === "ALL" ? "All" : status.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <header className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Delivery queue</h3>
              <span className="text-xs text-muted-foreground">
                {deliveriesState.items.length} loaded
              </span>
            </header>

            {deliveriesState.items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                No deliveries matched the current filter.
              </div>
            ) : (
              <ul className="space-y-3">
                {deliveriesState.items.map((delivery) => {
                  const selected = selectedDeliveryId === delivery.id;
                  return (
                    <li key={delivery.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedDeliveryId(delivery.id)}
                        className={[
                          "w-full rounded-lg border p-3 text-left transition",
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background/40 hover:bg-muted/40",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{delivery.id}</p>
                            <p className="text-xs text-muted-foreground">
                              External ID: {delivery.externalId || "Not set"}
                            </p>
                          </div>
                          <span
                            className={[
                              "inline-flex rounded-full border px-2 py-1 text-[11px] font-medium",
                              getStatusTone(delivery.status),
                            ].join(" ")}
                          >
                            {delivery.status}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground">
                          <p>
                            Custodian tenant:{" "}
                            {delivery.currentCustodianTenantId || "Not assigned"}
                          </p>
                          <p>
                            Custodian node:{" "}
                            {delivery.currentCustodianNodeId || "Not assigned"}
                          </p>
                          <p>Updated: {formatTimestamp(delivery.updatedAt)}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {deliveriesState.nextCursor && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/40 disabled:opacity-60"
                >
                  {loadingMore ? "Loading more..." : "Load more deliveries"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {!selectedDeliveryId ? (
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold">Select a delivery</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a delivery from the queue to inspect its timeline, custody
                state, and handoff history.
              </p>
            </section>
          ) : detailError ? (
            <LoadErrorCard
              title="Could not load delivery detail"
              description={detailError}
              onAction={() => setDetailReloadKey((value) => value + 1)}
            />
          ) : (
            <>
              <section className="rounded-xl border border-border bg-card p-5">
                <header className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Delivery detail</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Current delivery state from the BLN facade.
                    </p>
                  </div>
                  {detailState.delivery?.status && (
                    <span
                      className={[
                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                        getStatusTone(detailState.delivery.status),
                      ].join(" ")}
                    >
                      {detailState.delivery.status}
                    </span>
                  )}
                </header>

                {loadingDetail ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 w-48 rounded-md bg-muted/60" />
                    <div className="h-16 rounded-lg bg-muted/40" />
                    <div className="h-16 rounded-lg bg-muted/40" />
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailCard
                      title="Identity"
                      rows={[
                        ["Delivery ID", detailState.delivery?.id || selectedDeliveryId],
                        ["External ID", detailState.delivery?.externalId || "Not set"],
                        [
                          "Created",
                          formatTimestamp(detailState.delivery?.createdAt),
                        ],
                        [
                          "Updated",
                          formatTimestamp(detailState.delivery?.updatedAt),
                        ],
                      ]}
                    />
                    <DetailCard
                      title="Current custody"
                      rows={[
                        [
                          "Tenant",
                          detailState.handoffStatus?.currentCustodianTenantId ||
                            detailState.delivery?.currentCustodianTenantId ||
                            "Not assigned",
                        ],
                        [
                          "Node",
                          detailState.handoffStatus?.currentCustodianNodeId ||
                            detailState.delivery?.currentCustodianNodeId ||
                            "Not assigned",
                        ],
                        [
                          "Delivery status",
                          detailState.handoffStatus?.deliveryStatus ||
                            detailState.delivery?.status ||
                            "Unknown",
                        ],
                      ]}
                    />
                    <DetailCard
                      title="Active handoff"
                      rows={[
                        [
                          "Handoff status",
                          detailState.handoffStatus?.handoff?.status || "None",
                        ],
                        [
                          "Receiving tenant",
                          detailState.handoffStatus?.handoff?.toTenantId || "Not assigned",
                        ],
                        [
                          "Receiving node",
                          detailState.handoffStatus?.handoff?.toNodeId || "Not assigned",
                        ],
                        [
                          "Expires",
                          formatTimestamp(
                            detailState.handoffStatus?.handoff?.expiresAt || null
                          ),
                        ],
                      ]}
                    />
                    <DetailCard
                      title="Metadata"
                      rows={[
                        [
                          "Metadata keys",
                          String(
                            Object.keys(detailState.delivery?.metadata || {}).length
                          ),
                        ],
                        [
                          "Last event",
                          detailState.events[detailState.events.length - 1]?.type ||
                            "No events yet",
                        ],
                        [
                          "Handoff records",
                          String(detailState.handoffs.length),
                        ],
                      ]}
                    />
                  </div>
                )}
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-5">
                  <header className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Event timeline</h3>
                    <span className="text-xs text-muted-foreground">
                      {detailState.events.length} events
                    </span>
                  </header>
                  {detailState.events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No BLN events are available for this delivery yet.
                    </p>
                  ) : (
                    <ol className="space-y-3">
                      {detailState.events.map((event, index) => (
                        <li
                          key={`${event.type}-${event.timestamp || event.createdAt || index}`}
                          className="rounded-lg border border-border/70 bg-background/40 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">{event.type}</p>
                            <span className="text-[11px] text-muted-foreground">
                              {formatTimestamp(event.timestamp || event.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 break-all text-[11px] text-muted-foreground">
                            {JSON.stringify(event.payload || {}, null, 0)}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <header className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Handoff history</h3>
                    <span className="text-xs text-muted-foreground">
                      {detailState.handoffs.length} records
                    </span>
                  </header>
                  {detailState.handoffs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No handoffs have been recorded for this delivery yet.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {detailState.handoffs.map((handoff) => (
                        <li
                          key={handoff.id}
                          className="rounded-lg border border-border/70 bg-background/40 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">{handoff.id}</p>
                            <span
                              className={[
                                "inline-flex rounded-full border px-2 py-1 text-[11px] font-medium",
                                getStatusTone(handoff.status),
                              ].join(" ")}
                            >
                              {handoff.status}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground">
                            <p>From tenant: {handoff.fromTenantId}</p>
                            <p>To tenant: {handoff.toTenantId}</p>
                            <p>From node: {handoff.fromNodeId}</p>
                            <p>To node: {handoff.toNodeId}</p>
                            <p>Created: {formatTimestamp(handoff.createdAt)}</p>
                            <p>Expires: {formatTimestamp(handoff.expiresAt)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}

function DetailCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <article className="rounded-lg border border-border/70 bg-background/40 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div
            key={`${title}-${label}`}
            className="flex items-start justify-between gap-3"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="max-w-[60%] break-all text-right font-medium">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
