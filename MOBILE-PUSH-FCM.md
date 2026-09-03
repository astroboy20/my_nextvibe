# In-App Notifications — API Reference

## The in-app list

Push is a tap-through, not the source of truth.

```
GET   /v1/notifications?page=1&limit=20     (authenticated)
PATCH /v1/notifications/:id/read
PATCH /v1/notifications/read-all
```

`GET` returns `data` plus a `meta` block with `total`, `page`, `limit`,
`hasNext`, and `unreadCount` — use `meta.unreadCount` for the badge rather than
counting client-side.
