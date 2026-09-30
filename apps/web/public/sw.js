// Service worker chỉ để nhận Web Push (FR-009.6) — không cache, không offline.

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'SportsForAll', {
      body: data.body || undefined,
      data: { link: data.link || '/dashboard' },
    }),
  );
});

// Bấm thông báo: có tab SportsForAll đang mở thì chuyển tab đó tới link, không
// thì mở tab mới.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data.link, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      const tab = tabs.find((t) => new URL(t.url).origin === self.location.origin);
      return tab ? tab.focus().then((t) => t.navigate(url)) : self.clients.openWindow(url);
    }),
  );
});
