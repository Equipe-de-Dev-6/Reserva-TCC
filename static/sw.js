/* =========================================================
   sw.js — Service Worker de notificações e PWA
   ---------------------------------------------------------
   Este arquivo precisa ficar na RAIZ do site
   (ex.: public/sw.js -> https://seusite.com/sw.js).
   Se ficar dentro de /js, o escopo dele não cobre o site todo.
   ========================================================= */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Verificar se o navegador suporta Service Worker e PWA
const isPWA = window.matchMedia('(display-mode: standalone)').matches;

// Mostrar notificação de instalação se não for PWA
function showInstallNotification() {
  if (!('serviceWorker' in navigator)) return;

  // Verificar se já está instalado como PWA
  if (isPWA) return;

  // Não guardamos em localStorage para que a notificação
  // sempre apareça para usuários que ainda não instalaram
  
  // Solicitar permissão e mostrar notificação
  navigator.serviceWorker.ready.then((registration) => {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        const notification = registration.showNotification(
          'Reserva SENAI',
          {
            body: 'Instale o aplicativo para ter acesso rápido na tela inicial',
            icon: '/static/assets/img/logo-pwa.png',
            badge: '/static/assets/img/logo-pwa.png',
            vibrate: [200, 100, 200],
            data: {
              url: '/home'
            }
          }
        );

        // Quando o usuário clicar na notificação
        notification.onclick = (event) => {
          event.notification.close();
          event.waitUntil(
            clients.openWindow(notification.data.url)
          );
        };
      }
    });
  });
}

// Executar quando a página carregar
if ('serviceWorker' in navigator) {
  window.addEventListener('load', showInstallNotification);
}

// Lidar with clicks nas notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const destino =
    (event.notification.data && event.notification.data.url) || '/home';

  event.waitUntil(
    clients
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