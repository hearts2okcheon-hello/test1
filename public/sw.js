// 옥!소리 서비스 워커: 홈 화면 앱 + 휴대폰 알림 (ADR-013)
// 화면은 늘 최신이어야 하므로 따로 저장(캐시)하지 않는다.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// 홈 화면 설치 조건을 맞추기 위한 빈 fetch 처리 (그대로 네트워크로)
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "옥!소리";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url: data.url || "/" },
      lang: "ko",
    }),
  );
});

// 알림을 누르면 열려 있는 옥!소리 창으로 가고, 없으면 새로 연다
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && "focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
