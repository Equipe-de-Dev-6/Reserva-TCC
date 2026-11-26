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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // A URL vem dos dados da notificação criada na página. Se não
  // houver, a home do perfil é um destino seguro.
  const destino =
    (event.notification.data && event.notification.data.url) || '/home';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((janelas) => {
        // Reaproveita uma aba já aberta em vez de abrir outra.
        for (const janela of janelas) {
          if ('focus' in janela) {
            if ('navigate' in janela) {
              return janela.navigate(destino).then((alvo) => (alvo || janela).focus());
            }
            return janela.focus();
          }
        }
        return self.clients.openWindow(destino);
      })
  );
});
