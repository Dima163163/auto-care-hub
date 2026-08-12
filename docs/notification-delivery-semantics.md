# Notification Delivery Semantics

## In-app delivery

Security and booking notifications are persisted through the outbox. An idempotency key prevents duplicate records when a worker retries the same event.

## Email delivery

Email delivery is opt-in through the account-level email preference. Booking email delivery additionally respects the booking-specific preference. In-app security notices remain enabled even when email is disabled.

## Failure handling

Outbox events are claimed with a lease, retried with bounded attempts, and moved to `dead_letter` after the final failed attempt. Errors are length-limited before persistence.

## Booking reminders

The maintenance worker queues a booking reminder when the appointment is in
the configured `BOOKING_REMINDER_HOURS` window. The default is 24 hours and
the safe operator range is 1 to 168 hours. The reminder remains idempotent and
delivery still requires both the account-level and booking-specific email
preferences.

## Retention

Notifications older than the configured retention period are removed by the maintenance cycle. The default is 180 days and the accepted maximum is 730 days.
