import { apiClient } from "@/lib/apiClient";

export type ProvisionSelfNetworkPayload = {
  tenantName: string;
  phoneNumber: string;
  trustScore?: number;
};

export async function provisionSelfNetwork(
  payload: ProvisionSelfNetworkPayload
) {
  const { data } = await apiClient.post("/api/v1/network/provision-self", payload, {
    withCredentials: true,
  });
  return data as Record<string, unknown>;
}
