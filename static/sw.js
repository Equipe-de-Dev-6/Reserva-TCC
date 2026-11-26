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
const isPWA = self.matchMedia ? self.matchMedia('(display-mode: standalone)').matches : false;

// Mostrar notificação de instalação se não for PWA
function showInstallNotification() {
  if (!('serviceWorker' in self)) return;

  // Verificar se já está instalado como PWA
  if (isPWA) return;

  // Não guardamos em localStorage para que a notificação
  // sempre apareça para usuários que ainda não instalaram

  // Solicitar permissão e mostrar notificação
  self.registration.ready.then((registration) => {
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

// Executar quando o service worker ativar
if ('serviceWorker' in self) {
  // Aguarda o controle dos clientes antes de mostrar a notificação
  self.clients.matchAll().then(() => {
    showInstallNotification();
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/home')
  );
});
