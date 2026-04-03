jest.mock("../src/app/deliveryEvents/deliveryEvents.repository", () => ({
  list: jest.fn(),
  create: jest.fn(),
}));

const DeliveryEventsRepository = require("../src/app/deliveryEvents/deliveryEvents.repository");
const DeliveryEventsService = require("../src/app/deliveryEvents/deliveryEvents.service");

describe("delivery events service", () => {
  beforeEach(() => {
    DeliveryEventsRepository.list.mockReset();
    DeliveryEventsRepository.create.mockReset();
  });

  test("createDeliveryEvent rejects non-delivery event types", async () => {
    await expect(
      DeliveryEventsService.createDeliveryEvent({
        type: "user.created",
        payload: { uid: "user-1" },
      })
    ).rejects.toMatchObject({
      name: "ZodError",
    });

    expect(DeliveryEventsRepository.create).not.toHaveBeenCalled();
  });

  test("createDeliveryEvent accepts delivery-scoped event types", async () => {
    DeliveryEventsRepository.create.mockResolvedValue({
      id: "evt-1",
      type: "delivery.created",
      payload: { deliveryId: "del-1" },
      createdAt: 1,
    });

    const result = await DeliveryEventsService.createDeliveryEvent({
      type: "delivery.created",
      payload: { deliveryId: "del-1" },
    });

    expect(DeliveryEventsRepository.create).toHaveBeenCalledWith({
      type: "delivery.created",
      payload: { deliveryId: "del-1" },
    });
    expect(result).toEqual({
      id: "evt-1",
      type: "delivery.created",
      payload: { deliveryId: "del-1" },
      createdAt: 1,
    });
  });
});
