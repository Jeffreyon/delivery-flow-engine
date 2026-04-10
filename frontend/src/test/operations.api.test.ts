import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/apiClient";
import {
  fetchRemoteDeliveries,
  fetchRemoteHandoffs,
} from "@/services/operations.api";

vi.mock("@/lib/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("operations.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads remote deliveries through the local facade route", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        items: [{ id: "delivery-1", status: "IN_TRANSIT" }],
        nextCursor: null,
      },
    } as never);

    await expect(
      fetchRemoteDeliveries({ status: "IN_TRANSIT", limit: 12 })
    ).resolves.toEqual({
      items: [{ id: "delivery-1", status: "IN_TRANSIT" }],
      nextCursor: null,
    });

    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/deliveries", {
      withCredentials: true,
      params: { status: "IN_TRANSIT", limit: 12 },
    });
  });

  it("loads handoff history through the local facade route", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        items: [{ id: "handoff-1", deliveryId: "delivery-1", status: "REQUESTED" }],
      },
    } as never);

    await expect(fetchRemoteHandoffs("delivery-1")).resolves.toEqual({
      items: [{ id: "handoff-1", deliveryId: "delivery-1", status: "REQUESTED" }],
    });

    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/handoffs", {
      withCredentials: true,
      params: { deliveryId: "delivery-1" },
    });
  });
});
