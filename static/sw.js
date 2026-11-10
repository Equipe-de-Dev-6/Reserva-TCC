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

  // Verificar se já foi mostrado antes ou se já está instalado
  if (isPWA) return;

  // Verificar se o usuário já interagiu (para não spammar)
  const hasInteracted = new Promise(resolve => {
    const wrapped = () => {
      resolve(true);
      window.removeEventListener('click', wrapped);
      window.removeEventListener('keydown', wrapped);
    });
    window.addEventListener('click', wrapped);
    window.addEventListener('keydown', wrapped);
  });

  // Mostrar notificação após um pequeno atraso
  setTimeout(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        const notification = await registration.showNotification(
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
    } catch (error) {
      console.error('Erro ao mostrar notificação de instalação:', error);
    }
  }, 3000);
}

// Executar quando a página carregar
if ('serviceWorker' in navigator) {
  window.addEventListener('load', showInstallNotification);
}

// Lidar com clicks nas notificações
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