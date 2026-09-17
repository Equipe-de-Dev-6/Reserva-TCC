/* =========================================================
   /js/notificacoes-push.js
   ---------------------------------------------------------
   Notificações do sistema (celular, desktop, tablet) para:

     1. Avisos Importantes publicados
     2. Reservas criadas pelo professor
     3. Reservas negadas pelo coordenador
     4. Lembrete 1 hora antes de cada reserva aprovada

   Depende de /js/avisos.js (AvisosApp) e /js/reservas.js
   (ReservasApp). Funciona mesmo se só um dos dois existir
   na página.

   Carregar DEPOIS dos outros scripts:
     <script src="/js/reservas.js"></script>
     <script src="/js/avisos.js"></script>
     <script src="/js/notificacoes-push.js"></script>
   ========================================================= */

(function () {
  'use strict';

  /* ======================================================
     CONFIGURAÇÃO
     ====================================================== */

  const CONFIG = {

    // Caminho do service worker (precisa estar na raiz)
    swPath: '/sw.js',

    // Minutos de antecedência do lembrete
    minutosAntes: 60,

    // De quanto em quanto tempo checar os lembretes (ms)
    intervaloChecagem: 30 * 1000,

    // Se o usuário clicar em "Agora não", perguntar de novo
    // depois desse tempo, sem precisar recarregar a página (ms)
    reperguntarEm: 10 * 60 * 1000,

    // Ícone das notificações
    icone: '/assets/img/Logo senai.png',
    badge: '/assets/icons/notification.png',

    // Status usados pelo reservas.js:
    // 'aguardando' (padrão), 'aprovada', 'negado', 'cancelada'
    statusAprovado: ['aprovada'],
    statusNegado: ['negado'],
    statusCancelado: ['cancelada'],

    // Notificar também quando o coordenador APROVAR?
    notificarAprovacao: false
  };

  const KEYS = {
    avisos: 'push.avisosVistos',
    reservas: 'push.reservasEstado',
    lembretes: 'push.lembretesEnviados',
    iniciado: 'push.primeiraExecucao'
  };


  /* ======================================================
     ARMAZENAMENTO (à prova de modo anônimo / storage cheio)
     ====================================================== */

  function ler(chave, padrao) {
    try {
      const bruto = localStorage.getItem(chave);
      return bruto ? JSON.parse(bruto) : padrao;
    } catch (e) {
      return padrao;
    }
  }

  function salvar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch (e) {
      /* silencioso */
    }
  }


  /* ======================================================
     SUPORTE E PERMISSÃO
     ====================================================== */

  const suportado =
    typeof window !== 'undefined' &&
    'Notification' in window;

  let registroSW = null;

  function permissao() {
    return suportado ? Notification.permission : 'unsupported';
  }

  function ativo() {
    return permissao() === 'granted';
  }

  async function registrarSW() {

    if (!('serviceWorker' in navigator)) {
      return null;
    }

    try {
      registroSW = await navigator.serviceWorker.register(CONFIG.swPath);
      await navigator.serviceWorker.ready;
      return registroSW;
    } catch (e) {
      console.warn('[notificacoes] service worker indisponível:', e.message);
      return null;
    }
  }

  async function pedirPermissao() {

    if (!suportado) {
      return 'unsupported';
    }

    let resultado = Notification.permission;

    if (resultado === 'default') {
      try {
        resultado = await Notification.requestPermission();
      } catch (e) {
        resultado = Notification.permission;
      }
    }

    if (resultado === 'granted') {
      await registrarSW();
      notificar({
        titulo: 'Notificações ativadas',
        corpo: 'Você será avisado sobre avisos importantes, suas reservas e lembretes de uso.',
        tag: 'push-ativado',
        url: '/home'
      });
    }

    return resultado;
  }


  /* ======================================================
     DISPARAR NOTIFICAÇÃO
     ====================================================== */

  async function notificar({ titulo, corpo, tag, url }) {

    if (!ativo()) {
      return;
    }

    const opcoes = {
      body: corpo,
      tag: tag,
      icon: CONFIG.icone,
      badge: CONFIG.badge,
      renotify: true,
      data: { url: url || '/home' }
    };

    try {

      if (!registroSW && 'serviceWorker' in navigator) {
        registroSW = await navigator.serviceWorker.getRegistration(CONFIG.swPath);
      }

      if (registroSW && registroSW.showNotification) {
        await registroSW.showNotification(titulo, opcoes);
        return;
      }

      // Fallback desktop (no Android o construtor não funciona)
      const n = new Notification(titulo, opcoes);

      n.onclick = () => {
        window.focus();
        window.location.href = opcoes.data.url;
        n.close();
      };

    } catch (e) {
      console.warn('[notificacoes] falha ao exibir:', e.message);
    }
  }


  /* ======================================================
     BANNER DE PERMISSÃO
     ------------------------------------------------------
     O navegador só aceita o pedido de permissão vindo de um
     clique do usuário, e depois de um "Bloquear" ele NUNCA
     mais mostra o próprio popup. Por isso:

       - permissão "default"  -> banner com botão "Ativar"
       - permissão "denied"   -> banner explicando como
                                 desbloquear nas configurações

     Nos dois casos o banner volta a aparecer a cada carga
     de página e a cada CONFIG.reperguntarEm.
     ====================================================== */

  const CSS_BANNER = `
    .push-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;
      max-width:460px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;
      border-left:4px solid #E30613;border-radius:12px;padding:16px 18px;
      box-shadow:0 10px 30px rgba(17,24,39,.18);font-family:'Inter',sans-serif;
      display:flex;flex-direction:column;gap:10px}
    .push-banner h4{margin:0;font-size:14px;font-weight:800;color:#1F2937}
    .push-banner p{margin:0;font-size:12.5px;line-height:1.5;color:#6B7280}
    .push-banner ol{margin:0;padding-left:18px;font-size:12px;color:#6B7280;line-height:1.6}
    .push-banner-acoes{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
    .push-banner button{font-family:'Inter',sans-serif;font-size:12.5px;font-weight:700;
      padding:9px 16px;border-radius:8px;cursor:pointer;border:1px solid #E5E7EB;
      background:#fff;color:#1F2937;transition:.2s}
    .push-banner button:hover{background:#F9FAFB}
    .push-banner button.push-primario{background:#E30613;border-color:#E30613;color:#fff}
    .push-banner button.push-primario:hover{background:#CC0000}
    .push-banner button:focus-visible{outline:2px solid #1F2937;outline-offset:2px}
    @media (max-width:600px){
      .push-banner-acoes{flex-direction:column-reverse}
      .push-banner button{width:100%}
    }
  `;

  let banner = null;
  let timerRepergunta = null;

  function injetarCSS() {
    if (document.getElementById('push-banner-css')) return;
    const style = document.createElement('style');
    style.id = 'push-banner-css';
    style.textContent = CSS_BANNER;
    document.head.appendChild(style);
  }

  function fecharBanner() {

    if (banner) {
      banner.remove();
      banner = null;
    }

    clearTimeout(timerRepergunta);

    timerRepergunta = setTimeout(mostrarBanner, CONFIG.reperguntarEm);
  }

  function mostrarBanner() {

    if (!suportado || ativo() || banner) {
      return;
    }

    injetarCSS();

    const bloqueado = permissao() === 'denied';

    banner = document.createElement('div');
    banner.className = 'push-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');

    banner.innerHTML = bloqueado
      ? `
        <h4>As notificações estão bloqueadas neste navegador</h4>
        <p>Para voltar a receber avisos importantes, confirmações de reserva e o lembrete de 1 hora antes, libere as notificações do site:</p>
        <ol>
          <li>Toque no cadeado (ou no ícone ao lado do endereço).</li>
          <li>Abra "Permissões" ou "Configurações do site".</li>
          <li>Mude "Notificações" para <strong>Permitir</strong>.</li>
        </ol>
        <div class="push-banner-acoes">
          <button type="button" data-push="depois">Agora não</button>
          <button type="button" class="push-primario" data-push="recheck">Já liberei</button>
        </div>
      `
      : `
        <h4>Ativar notificações</h4>
        <p>Receba no celular ou no computador os avisos importantes, a confirmação das suas reservas, as reservas negadas pelo coordenador e um lembrete 1 hora antes de cada reserva aprovada.</p>
        <div class="push-banner-acoes">
          <button type="button" data-push="depois">Agora não</button>
          <button type="button" class="push-primario" data-push="ativar">Ativar notificações</button>
        </div>
      `;

    banner.addEventListener('click', async (e) => {

      const acao = e.target.closest('[data-push]');
      if (!acao) return;

      const tipo = acao.dataset.push;

      if (tipo === 'depois') {
        fecharBanner();
        return;
      }

      if (tipo === 'ativar') {
        const r = await pedirPermissao();
        if (r === 'granted') {
          banner.remove();
          banner = null;
          clearTimeout(timerRepergunta);
          sincronizarTudo();
        } else {
          banner.remove();
          banner = null;
          mostrarBanner(); // volta já com as instruções de desbloqueio
        }
        return;
      }

      if (tipo === 'recheck') {
        banner.remove();
        banner = null;

        if (ativo()) {
          await registrarSW();
          sincronizarTudo();
        } else {
          mostrarBanner();
        }
      }
    });

    document.body.appendChild(banner);
  }


  /* ======================================================
     LEITURA DOS DADOS DO APP
     ====================================================== */

  function temAvisos() {
    return typeof window.AvisosApp !== 'undefined' &&
      typeof window.AvisosApp.getAvisos === 'function';
  }

  function temReservas() {
    return typeof window.ReservasApp !== 'undefined';
  }

  function getReservas() {

    if (!temReservas()) return [];

    try {
      const lista = window.ReservasApp.getReservas();
      return Array.isArray(lista) ? lista : [];
    } catch (e) {
      return [];
    }
  }

  function normalizar(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function ehAprovada(status) {
    return CONFIG.statusAprovado.includes(normalizar(status));
  }

  function ehNegada(status) {
    return CONFIG.statusNegado.includes(normalizar(status));
  }

  function nomeRecurso(r) {
    return r.item || r.sala || r.recurso || r.categoria || 'Recurso';
  }

  function dataBR(data) {
    if (!data) return '';
    try {
      if (temReservas() && window.ReservasApp.formatDateBR) {
        return window.ReservasApp.formatDateBR(data);
      }
    } catch (e) { /* segue abaixo */ }
    const [a, m, d] = String(data).split('-');
    return d && m && a ? `${d}/${m}/${a}` : String(data);
  }

  function dataHora(data, hora) {

    if (!data) return null;

    const [a, m, d] = String(data).split('-').map(Number);
    const [hh, mm] = String(hora || '00:00').split(':').map(Number);

    if (!a || !m || !d) return null;

    return new Date(a, m - 1, d, hh || 0, mm || 0, 0, 0);
  }


  /* ======================================================
     1. AVISOS IMPORTANTES
     ====================================================== */

  function checarAvisos(silencioso) {

    if (!temAvisos()) return;

    let lista = [];

    try {
      lista = window.AvisosApp.getAvisos() || [];
    } catch (e) {
      return;
    }

    const vistos = ler(KEYS.avisos, []);
    const novos = [];

    lista.forEach((a) => {
      const id = String(a.id);
      if (!vistos.includes(id)) {
        vistos.push(id);
        novos.push(a);
      }
    });

    salvar(KEYS.avisos, vistos.slice(-300));

    if (silencioso) return;

    novos.forEach((a) => {

      const referencia = a.data ? ` · Referente a ${dataBR(a.data)}` : '';

      notificar({
        titulo: `Aviso importante: ${a.titulo}`,
        corpo: `${a.descricao || ''}${referencia}`.trim(),
        tag: `aviso-${a.id}`,
        url: '/avisos'
      });
    });
  }


  /* ======================================================
     2 e 3. RESERVAS CRIADAS E NEGADAS
     ====================================================== */

  function checarReservas(silencioso) {

    if (!temReservas()) return;

    const lista = getReservas();
    const anterior = ler(KEYS.reservas, {});
    const atual = {};

    lista.forEach((r) => {

      const id = String(r.id ?? `${r.data}-${r.horaEntrada}-${nomeRecurso(r)}`);
      const status = normalizar(r.status);

      atual[id] = status;

      if (silencioso) return;

      const antes = anterior[id];

      // Reserva nova feita pelo professor
      if (antes === undefined) {

        if (!ehNegada(status)) {
          notificar({
            titulo: 'Reserva registrada',
            corpo: `${nomeRecurso(r)} · ${dataBR(r.data)} · ${r.horaEntrada || ''}${r.horaSaida ? ' às ' + r.horaSaida : ''}. Aguardando o coordenador.`,
            tag: `reserva-nova-${id}`,
            url: '/reservas_prof'
          });
        } else {
          notificar({
            titulo: 'Reserva negada pelo coordenador',
            corpo: `${nomeRecurso(r)} · ${dataBR(r.data)}${r.motivoRecusa ? ' · ' + r.motivoRecusa : ''}`,
            tag: `reserva-negada-${id}`,
            url: '/reservas_prof'
          });
        }

        return;
      }

      // Mudança de status
      if (antes !== status) {

        if (ehNegada(status)) {
          notificar({
            titulo: 'Reserva negada pelo coordenador',
            corpo: `${nomeRecurso(r)} · ${dataBR(r.data)} · ${r.horaEntrada || ''}${r.motivoRecusa ? ' · ' + r.motivoRecusa : ''}`,
            tag: `reserva-negada-${id}`,
            url: '/reservas_prof'
          });
        }

        if (CONFIG.notificarAprovacao && ehAprovada(status)) {
          notificar({
            titulo: 'Reserva aprovada',
            corpo: `${nomeRecurso(r)} · ${dataBR(r.data)} · ${r.horaEntrada || ''}. Você será lembrado 1 hora antes.`,
            tag: `reserva-aprovada-${id}`,
            url: '/reservas_prof'
          });
        }
      }
    });

    salvar(KEYS.reservas, atual);
  }


  /* ======================================================
     4. LEMBRETE 1 HORA ANTES (reservas aprovadas)
     ====================================================== */

  function checarLembretes() {

    if (!ativo() || !temReservas()) return;

    const agora = Date.now();
    const enviados = ler(KEYS.lembretes, []);
    let mudou = false;

    getReservas().forEach((r) => {

      if (!ehAprovada(r.status)) return;

      const inicio = dataHora(r.data, r.horaEntrada);
      if (!inicio) return;

      const id = String(r.id ?? `${r.data}-${r.horaEntrada}-${nomeRecurso(r)}`);
      if (enviados.includes(id)) return;

      const alvo = inicio.getTime() - CONFIG.minutosAntes * 60 * 1000;

      // Dispara entre 1h antes e o horário de início
      if (agora >= alvo && agora < inicio.getTime()) {

        notificar({
          titulo: `Sua reserva começa em ${CONFIG.minutosAntes} minutos`,
          corpo: `${nomeRecurso(r)} · ${r.horaEntrada || ''}${r.horaSaida ? ' às ' + r.horaSaida : ''}${r.curso ? ' · ' + r.curso : ''}`,
          tag: `lembrete-${id}`,
          url: '/reservas_prof'
        });

        enviados.push(id);
        mudou = true;
      }

      // Já passou do início: marca para não disparar atrasado
      if (agora >= inicio.getTime()) {
        enviados.push(id);
        mudou = true;
      }
    });

    if (mudou) {
      salvar(KEYS.lembretes, enviados.slice(-500));
    }
  }


  /* ======================================================
     INICIALIZAÇÃO
     ====================================================== */

  function sincronizarTudo() {
    checarAvisos(false);
    checarReservas(false);
    checarLembretes();
  }

  function iniciar() {

    if (!suportado) {
      console.info('[notificacoes] este navegador não suporta notificações do sistema.');
      return;
    }

    // Primeira execução: guarda o que já existe sem notificar,
    // para o usuário não receber uma enxurrada de avisos antigos.
    const primeira = !ler(KEYS.iniciado, false);

    if (primeira) {
      checarAvisos(true);
      checarReservas(true);
      salvar(KEYS.iniciado, true);
    }

    if (ativo()) {
      registrarSW().then(sincronizarTudo);
    } else {
      mostrarBanner();
    }

    // Reage a qualquer mudança feita pelas telas do sistema
    if (temAvisos() && window.AvisosApp.subscribe) {
      window.AvisosApp.subscribe(() => checarAvisos(false));
    }

    if (temReservas() && window.ReservasApp.subscribe) {
      window.ReservasApp.subscribe(() => {
        checarReservas(false);
        checarLembretes();
      });
    }

    // Mudanças vindas de outra aba (ex.: coordenador em outra janela)
    window.addEventListener('storage', () => {
      checarAvisos(false);
      checarReservas(false);
      checarLembretes();
    });

    // Relógio dos lembretes
    setInterval(checarLembretes, CONFIG.intervaloChecagem);

    // Ao voltar para a aba, checa na hora
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checarLembretes();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }


  /* ======================================================
     API PÚBLICA (para testes no console)
     ====================================================== */

  window.PushNotificacoes = {
    pedirPermissao,
    mostrarBanner,
    notificar,
    sincronizar: sincronizarTudo,
    status: permissao,
    teste: () => notificar({
      titulo: 'Notificação de teste',
      corpo: 'Se você está vendo isto, as notificações estão funcionando.',
      tag: 'teste',
      url: '/home'
    })
  };

})();