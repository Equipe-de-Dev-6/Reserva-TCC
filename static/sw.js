/* =========================================================
   sw.js  —  Service Worker de notificações
   ---------------------------------------------------------
   IMPORTANTE: este arquivo precisa ficar na RAIZ do site
   (ex.: public/sw.js  ->  https://seusite.com/sw.js).
   Se ficar dentro de /js, o escopo dele não cobre o site todo.
   ========================================================= */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* Clique na notificação: foca uma aba já aberta ou abre uma nova */
self.addEventListener('notificationclick', (event) => {

  event.notification.close();

  const destino =
    (event.notification.data && event.notification.data.url) || '/home';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((janelas) => {

        for (const janela of janelas) {
          if ('focus' in janela) {
            if ('navigate' in janela) {
              return janela.navigate(destino).then((j) => (j || janela).focus());
            }
            return janela.focus();
          }
        }

        return self.clients.openWindow(destino);
      })
  );
});