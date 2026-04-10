import { apiClient } from "@/lib/apiClient";

export type NetworkIssue = {
  code: string;
  message: string;
};

export type NetworkBinding = {
  userId: string;
  tenantId: string | null;
  role: string | null;
  nodeId: string | null;
  status: string | null;
  isDefaultNode: boolean;
};

export type NetworkMembership = {
  userId: string;
  tenantId: string;
  role: string;
  status: string;
};

export type NetworkAssignment = {
  userId: string;
  tenantId: string;
  nodeId: string;
  isDefault: boolean;
  status: string;
};

export type NetworkInvitation = {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  status: string;
  nodeIds: string[];
  defaultNodeId: string | null;
  invitedByUserId: string | null;
  acceptedByUserId: string | null;
  acceptedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type NetworkInvitationListResponse = {
  scope: "self" | "tenant";
  tenantId?: string;
  items: NetworkInvitation[];
};

export type NetworkContextResponse = {
  actor: {
    uid: string;
    email: string | null;
    isAdmin: boolean;
  };
  userPhoneNumber: string | null;
  binding: NetworkBinding | null;
  memberships: NetworkMembership[];
  assignments: NetworkAssignment[];
  effectiveContext: {
    tenantId: string;
    nodeId: string | null;
  } | null;
  tenant: Record<string, unknown> | null;
  node: Record<string, unknown> | null;
  issues: NetworkIssue[];
};

export type BootstrapWorkspacePayload = {
  tenantName: string;
  phoneNumber: string;
  trustScore?: number;
};

export type RequestNodeOtpPayload = {
  phoneNumber?: string;
};

export type RequestNodeOtpResponse = {
  tenantId: string;
  membership: NetworkMembership | null;
  phoneNumber: string;
  challengeId: string;
  expiresAt: number | null;
  provider: string | null;
  debugPin?: string | null;
};

export type VerifyNodeOtpPayload = {
  challengeId: string;
  pin: string;
};

export async function fetchNetworkContext() {
  const { data } = await apiClient.get("/api/v1/network/context", {
    withCredentials: true,
  });
  return data as NetworkContextResponse;
}

export async function bootstrapWorkspace(
  payload: BootstrapWorkspacePayload
) {
  const { data } = await apiClient.post(
    "/api/v1/network/workspaces/bootstrap",
    payload,
    {
      withCredentials: true,
    }
  );

  return data as Record<string, unknown>;
}

export async function fetchNetworkInvitations() {
  const { data } = await apiClient.get("/api/v1/network/invitations", {
    withCredentials: true,
  });

  return data as NetworkInvitationListResponse;
}

export async function requestSelfNodeOtp(payload: RequestNodeOtpPayload) {
  const { data } = await apiClient.post(
    "/api/v1/network/nodes/self/request-otp",
    payload,
    {
      withCredentials: true,
    }
  );

  return data as RequestNodeOtpResponse;
}

export async function verifySelfNodeOtp(payload: VerifyNodeOtpPayload) {
  const { data } = await apiClient.post(
    "/api/v1/network/nodes/self/verify-otp",
    payload,
    {
      withCredentials: true,
    }
  );

  return data as Record<string, unknown>;
}

export async function acceptNetworkInvitation(invitationId: string) {
  const { data } = await apiClient.post(
    `/api/v1/network/invitations/${invitationId}/accept`,
    {},
    {
      withCredentials: true,
    }
  );

  return data as Record<string, unknown>;
}
