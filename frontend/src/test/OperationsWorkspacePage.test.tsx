import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OperationsWorkspacePage from "@/pages/user/OperationsWorkspacePage";
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
} from "@/services/operations.api";

vi.mock("@/services/network.api", () => ({
  fetchNetworkContext: vi.fn(),
}));

vi.mock("@/services/operations.api", () => ({
  fetchRemoteDeliveries: vi.fn(),
  fetchRemoteDelivery: vi.fn(),
  fetchRemoteDeliveryEvents: vi.fn(),
  fetchRemoteHandoffStatus: vi.fn(),
  fetchRemoteHandoffs: vi.fn(),
}));

function buildContext(
  overrides: Partial<NetworkContextResponse> = {}
): NetworkContextResponse {
  return {
    actor: {
      uid: "user-1",
      email: "user@example.com",
      isAdmin: false,
    },
    userPhoneNumber: "+2348012345678",
    binding: null,
    memberships: [],
    assignments: [],
    effectiveContext: {
      tenantId: "tenant-1",
      nodeId: "node-1",
    },
    tenant: { id: "tenant-1" },
    node: { id: "node-1" },
    issues: [],
    ...overrides,
  };
}

describe("OperationsWorkspacePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the setup CTA when the current user has no active node context", async () => {
    vi.mocked(fetchNetworkContext).mockResolvedValue(
      buildContext({
        effectiveContext: null,
        node: null,
        issues: [
          {
            code: "BLN_NODE_OTP_REQUIRED",
            message: "Verify your phone number to activate a BLN node.",
          },
        ],
      })
    );

    render(
      <MemoryRouter>
        <OperationsWorkspacePage />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Operations access is not ready" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Finish workspace setup" })
    ).toBeInTheDocument();
  });

  it("renders delivery summaries and detail from the BLN facade", async () => {
    vi.mocked(fetchNetworkContext).mockResolvedValue(buildContext());
    vi.mocked(fetchRemoteDeliveries).mockResolvedValue({
      items: [
        {
          id: "delivery-1",
          externalId: "ext-1",
          status: "IN_TRANSIT",
          currentCustodianTenantId: "tenant-1",
          currentCustodianNodeId: "node-1",
          createdAt: 1711111111111,
          updatedAt: 1711112222222,
        },
      ],
      nextCursor: null,
    });
    vi.mocked(fetchRemoteDelivery).mockResolvedValue({
      id: "delivery-1",
      externalId: "ext-1",
      status: "IN_TRANSIT",
      currentCustodianTenantId: "tenant-1",
      currentCustodianNodeId: "node-1",
      metadata: { fragile: true },
      createdAt: 1711111111111,
      updatedAt: 1711112222222,
    });
    vi.mocked(fetchRemoteDeliveryEvents).mockResolvedValue([
      {
        type: "HANDOFF_PIN_SENT",
        timestamp: 1711113333333,
        payload: { provider: "africastalking" },
      },
    ]);
    vi.mocked(fetchRemoteHandoffStatus).mockResolvedValue({
      deliveryId: "delivery-1",
      deliveryStatus: "IN_TRANSIT",
      currentCustodianTenantId: "tenant-1",
      currentCustodianNodeId: "node-1",
      handoff: {
        id: "handoff-1",
        deliveryId: "delivery-1",
        fromTenantId: "tenant-1",
        toTenantId: "tenant-2",
        fromNodeId: "node-1",
        toNodeId: "node-2",
        status: "REQUESTED",
        createdAt: 1711113333333,
        expiresAt: 1711114444444,
      },
    });
    vi.mocked(fetchRemoteHandoffs).mockResolvedValue({
      items: [
        {
          id: "handoff-1",
          deliveryId: "delivery-1",
          fromTenantId: "tenant-1",
          toTenantId: "tenant-2",
          fromNodeId: "node-1",
          toNodeId: "node-2",
          status: "REQUESTED",
          createdAt: 1711113333333,
          expiresAt: 1711114444444,
        },
      ],
    });

    render(
      <MemoryRouter>
        <OperationsWorkspacePage />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Operations workspace" })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchRemoteDelivery).toHaveBeenCalledWith("delivery-1");
    });

    expect(screen.getByText("Visible deliveries")).toBeInTheDocument();
    expect(screen.getByText("Delivery queue")).toBeInTheDocument();
    expect(screen.getAllByText("delivery-1").length).toBeGreaterThan(0);
    expect(screen.getByText("Event timeline")).toBeInTheDocument();
    expect(screen.getByText("Handoff history")).toBeInTheDocument();
    expect(screen.getAllByText("HANDOFF_PIN_SENT").length).toBeGreaterThan(0);
  });
});
