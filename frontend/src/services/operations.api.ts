import { apiClient } from "@/lib/apiClient";

export type RemoteDelivery = {
  id: string;
  externalId?: string | null;
  status: string;
  currentCustodianTenantId?: string | null;
  currentCustodianNodeId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: number | null;
  updatedAt?: number | null;
};

export type RemoteDeliveriesResponse = {
  items: RemoteDelivery[];
  nextCursor: string | null;
};

export type RemoteDeliveryEvent = {
  id?: string;
  deliveryId?: string;
  type: string;
  payload?: Record<string, unknown> | null;
  timestamp?: number | null;
  createdAt?: number | null;
};

export type RemoteHandoff = {
  id: string;
  deliveryId: string;
  fromTenantId: string;
  toTenantId: string;
  fromNodeId: string;
  toNodeId: string;
  status: string;
  expiresAt?: number | null;
  attemptCount?: number | null;
  verifiedAt?: number | null;
  createdAt?: number | null;
};

export type RemoteHandoffStatus = {
  deliveryId: string;
  deliveryStatus: string;
  currentCustodianTenantId?: string | null;
  currentCustodianNodeId?: string | null;
  handoff?: RemoteHandoff | null;
};

export type FetchRemoteDeliveriesParams = {
  status?: string;
  cursor?: string | null;
  limit?: number;
};

export async function fetchRemoteDeliveries(
  params: FetchRemoteDeliveriesParams = {}
) {
  const { data } = await apiClient.get("/api/v1/deliveries", {
    withCredentials: true,
    params,
  });

  return data as RemoteDeliveriesResponse;
}

export async function fetchRemoteDelivery(id: string) {
  const { data } = await apiClient.get(`/api/v1/deliveries/${id}`, {
    withCredentials: true,
  });

  return data as RemoteDelivery;
}

export async function fetchRemoteDeliveryEvents(deliveryId: string) {
  const { data } = await apiClient.get(
    `/api/v1/deliveries/${deliveryId}/events`,
    {
      withCredentials: true,
    }
  );

  return data as RemoteDeliveryEvent[];
}

export async function fetchRemoteHandoffStatus(deliveryId: string) {
  const { data } = await apiClient.get(
    `/api/v1/deliveries/${deliveryId}/handoff-status`,
    {
      withCredentials: true,
    }
  );

  return data as RemoteHandoffStatus;
}

export async function fetchRemoteHandoffs(deliveryId: string) {
  const { data } = await apiClient.get("/api/v1/handoffs", {
    withCredentials: true,
    params: { deliveryId },
  });

  return data as { items: RemoteHandoff[] };
}
