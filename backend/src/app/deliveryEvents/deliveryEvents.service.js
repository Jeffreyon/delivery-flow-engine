const { z } = require("zod");
const DeliveryEventsRepository = require("./deliveryEvents.repository");

const DELIVERY_EVENT_PREFIXES = [
  "delivery.",
  "dispatch.",
  "assignment.",
  "order.",
  "driver.",
  "tracking.",
  "incident.",
];

function isDeliveryEventType(type) {
  return DELIVERY_EVENT_PREFIXES.some((prefix) => type.startsWith(prefix));
}

const createDeliveryEventSchema = z.object({
  type: z
    .string()
    .min(1)
    .refine(isDeliveryEventType, {
      message:
        "Delivery event types must use a delivery-specific namespace such as delivery., dispatch., assignment., order., driver., tracking., or incident.",
    }),
  payload: z.record(z.any()).default({}),
});

function toEventDTO(doc) {
  if (!doc) return null;
  const { id, type, payload, createdAt } = doc;
  return { id, type, payload: payload || {}, createdAt };
}

async function listDeliveryEvents(type) {
  const docs = await DeliveryEventsRepository.list(50, type);
  return docs.map(toEventDTO).filter(Boolean);
}

async function createDeliveryEvent(payload) {
  const parsed = createDeliveryEventSchema.parse(payload || {});
  const saved = await DeliveryEventsRepository.create({
    type: parsed.type,
    payload: parsed.payload,
  });
  return toEventDTO(saved);
}

module.exports = {
  listDeliveryEvents,
  createDeliveryEvent,
};
