DELETE FROM delivery_events de
USING events e
WHERE de.id = e.id
  AND NOT (
    e.type LIKE 'delivery.%'
    OR e.type LIKE 'dispatch.%'
    OR e.type LIKE 'assignment.%'
    OR e.type LIKE 'order.%'
    OR e.type LIKE 'driver.%'
    OR e.type LIKE 'tracking.%'
    OR e.type LIKE 'incident.%'
  );
