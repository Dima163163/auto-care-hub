# Native mobile readiness gate

Expo/React Native work starts only after the stable web gate passes. The web
API already separates pure AutoCare contracts from browser UI; the remaining
mobile evidence is:

- threat-modelled access/refresh/revocation with secure platform storage;
- private media upload/download without web cookies and with resumable recovery;
- cursor contracts for search, conversations, requests/bookings and
  notifications;
- push event types, authentication, deep links and stale/offline draft rules;
- analytics evidence that native clients solve a retention or usage problem;
- accessibility, crash reporting, device matrix, release channels and store
  privacy materials.

These are release gates, not permission to start the native app early.
