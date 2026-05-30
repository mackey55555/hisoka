// Web Push Service Worker handler
// next-pwa の自動生成 SW に importScripts でロードされる。
// このファイル単体では動かず、sw.js (workbox) と一緒に動く前提。

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Hisoka', body: event.data.text() };
    }
  }

  const title = data.title || 'Hisoka';
  const options = {
    body: data.body || '',
    icon: data.icon || '/images/icon-192.png',
    badge: data.badge || '/images/icon-192.png',
    tag: data.tag || 'hisoka-notification',
    data: {
      url: data.url || '/',
    },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // 既に開いてるタブがあればフォーカス
      for (const client of allClients) {
        try {
          const url = new URL(client.url);
          if (url.pathname === targetUrl || client.url.includes(targetUrl)) {
            if ('focus' in client) {
              return client.focus();
            }
          }
        } catch (e) {
          // URL 解析失敗時は無視
        }
      }

      // 無ければ新規ウィンドウで開く
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});
