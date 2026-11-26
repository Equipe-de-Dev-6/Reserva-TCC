/* =========================================================
   sw.js — Service Worker do Reserva SENAI
   ---------------------------------------------------------
   Este arquivo roda em outro contexto: não existe window nem
   navigator aqui. Por isso ele só cuida do que é do SW:
   ativação imediata e clique em notificações.

   Pedido de permissão e aviso de instalação ficam em
   /js/notificacoes-push.js, que roda na página.
   ========================================================= */

self.addEventListener('install', () => {
  // Sem skipWaiting, uma versão antiga continua respondendo até a
  // última aba fechar — e a correção do clique nunca apareceria.
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
