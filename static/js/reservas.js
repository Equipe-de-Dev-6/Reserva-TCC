/**
 * reservas.js
 *
 * Estado compartilhado das reservas do professor.
 *
 * Persistência:
 * - localStorage
 *
 * Sincronização entre páginas/abas:
 * - BroadcastChannel
 * - fallback para o evento "storage"
 *
 * Nenhuma tela precisa ser recarregada.
 */

const ReservasApp = (() => {
  // =========================================================
  // CONFIGURAÇÕES E CHAVES DE ARMAZENAMENTO
  // =========================================================

  const STORAGE_KEY = 'senai_reservas_professor';
  const TEMP_KEY = 'senai_nova_reserva';
  const NOTIFICATIONS_KEY = 'senai_notificacoes_reservas';
  const SALA_KEY = 'salaSelecionada';

  const CHANNEL_NAME = 'senai-reservas-sync';

  const channel =
    typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(CHANNEL_NAME)
      : null;

  const listeners = [];


  // =========================================================
  // FUNÇÕES INTERNAS
  // =========================================================

  /**
   * Gera um ID único.
   */
  function _uid(prefix = 'r') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }


  /**
   * Lê dados do localStorage.
   */
  function _read(key, fallback = []) {
    try {
      const raw = localStorage.getItem(key);

      return raw
        ? JSON.parse(raw)
        : fallback;

    } catch (e) {
      console.error(`Erro ao ler ${key}:`, e);
      return fallback;
    }
  }


  /**
   * Salva dados no localStorage.
   */
  function _write(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;

    } catch (e) {
      console.error(`Erro ao salvar ${key}:`, e);

      return false;
    }
  }


  /**
   * Notifica todas as páginas e componentes
   * sobre uma alteração nas reservas.
   */
  function _notify(action, reserva) {
    const payload = {
      action,
      reserva,
      timestamp: new Date().toISOString()
    };

    // Envia para outras abas
    if (channel) {
      channel.postMessage(payload);
    }

    // Atualiza a própria página
    _onChange(payload);
  }


  /**
   * Executa todos os listeners cadastrados.
   */
  function _onChange(payload) {
    _updateNotificationIndicators();

    listeners
      .slice()
      .forEach((listener) => {
        try {
          listener(payload);

        } catch (e) {
          console.error(
            'Erro ao atualizar tela:',
            e
          );
        }
      });


    // Evento personalizado para outras partes do sistema
    window.dispatchEvent(
      new CustomEvent(
        'senai:reservas-changed',
        {
          detail: payload
        }
      )
    );
  }


  // =========================================================
  // SINCRONIZAÇÃO ENTRE ABAS
  // =========================================================

  /**
   * BroadcastChannel:
   * sincroniza alterações entre abas abertas.
   */
  if (channel) {
    channel.addEventListener(
      'message',
      (event) => {
        _onChange(event.data || {});
      }
    );
  }


  /**
   * Fallback utilizando o evento storage.
   */
  window.addEventListener(
    'storage',
    (event) => {
      const keysMonitoradas = [
        STORAGE_KEY,
        NOTIFICATIONS_KEY
      ];

      if (keysMonitoradas.includes(event.key)) {
        _onChange({
          action: 'sync',
          reserva: null,
          timestamp: new Date().toISOString()
        });
      }
    }
  );


  // =========================================================
  // SISTEMA DE LISTENERS
  // =========================================================

  /**
   * Permite que uma tela seja avisada
   * quando alguma reserva mudar.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    listeners.push(listener);


    /**
     * Retorna uma função para remover o listener.
     */
    return () => {
      const index = listeners.indexOf(listener);

      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  }


  // =========================================================
  // LEITURA DE DADOS
  // =========================================================

  function getReservas() {
    return _read(STORAGE_KEY, []);
  }


  function getNotificacoes() {
    return _read(NOTIFICATIONS_KEY, []);
  }


  /**
   * Atualiza o indicador azul nos links de notificações
   * presentes em qualquer tela que carregue este arquivo.
   */
  function _updateNotificationIndicators() {
    const links = document.querySelectorAll(
      'a[href*="notificacoesprof.html"]'
    );
    const temNotificacoes = getNotificacoes().length > 0;

    links.forEach((link) => {
      link.classList.add('notifications-nav-link');

      let badge = link.querySelector('.notifications-badge');

      if (temNotificacoes && !badge) {
        badge = document.createElement('span');
        badge.className = 'notifications-badge';
        badge.setAttribute('aria-label', 'Há notificações');
        badge.setAttribute('title', 'Há notificações');
        link.appendChild(badge);
      }

      if (!temNotificacoes && badge) {
        badge.remove();
      }

      link.setAttribute(
        'aria-label',
        temNotificacoes ? 'Notificações: há novas notificações' : 'Notificações'
      );
    });
  }


  function _installNotificationIndicatorStyles() {
    if (document.getElementById('reservas-notification-indicator-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'reservas-notification-indicator-styles';
    style.textContent = `
      .notifications-nav-link {
        position: relative;
      }

      .notifications-badge {
        position: absolute;
        top: 3px;
        right: 2px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #2563eb;
        border: 2px solid #ffffff;
        box-sizing: content-box;
        pointer-events: none;
      }

      .nav-item.notifications-nav-link .notifications-badge {
        top: 7px;
        left: 28px;
        right: auto;
      }
    `;

    document.head.appendChild(style);
  }


  function _setupNotificationIndicators() {
    _installNotificationIndicatorStyles();

    if (document.readyState === 'loading') {
      document.addEventListener(
        'DOMContentLoaded',
        _updateNotificationIndicators,
        { once: true }
      );
    } else {
      _updateNotificationIndicators();
    }
  }


  // =========================================================
  // NOTIFICAÇÕES
  // =========================================================

  /**
   * Cria uma notificação relacionada
   * a uma alteração de reserva.
   */
  function _registrarNotificacao(action, reserva) {
    const textos = {
      criar: 'criada',
      editar: 'editada',
      cancelar: 'cancelada'
    };

    const notificacoes = getNotificacoes();


    notificacoes.unshift({
      id: _uid('n'),

      reservaId: reserva.id,

      action,

      criadoEm: new Date().toISOString(),

      titulo: `Reserva ${textos[action] || action}`,

      reserva: {
        ...reserva
      }
    });


    // Mantém no máximo 100 notificações
    _write(
      NOTIFICATIONS_KEY,
      notificacoes.slice(0, 100)
    );
  }


  /**
   * Exclui uma reserva definitivamente do armazenamento local.
   * As notificações ligadas a ela também são removidas.
   */
  function deleteReserva(id) {
    const lista = getReservas();
    const existe = lista.some((reserva) => reserva.id === id);

    if (!existe) {
      return false;
    }

    const salvou = _write(
      STORAGE_KEY,
      lista.filter((reserva) => reserva.id !== id)
    );

    if (!salvou) {
      return false;
    }

    _write(
      NOTIFICATIONS_KEY,
      getNotificacoes().filter((notificacao) => notificacao.reservaId !== id)
    );

    _notify('excluir', { id });
    return true;
  }


  /**
   * Exclui uma notificação individualmente e persiste a alteração.
   */
  function deleteNotificacao(id) {
    const notificacoes = getNotificacoes();
    const existe = notificacoes.some((notificacao) => notificacao.id === id);

    if (!existe) {
      return false;
    }

    const salvou = _write(
      NOTIFICATIONS_KEY,
      notificacoes.filter((notificacao) => notificacao.id !== id)
    );

    if (!salvou) {
      return false;
    }

    _notify('excluir-notificacao', { id });
    return true;
  }


  /**
   * Limpa todas as notificações persistidas.
   */
  function clearNotificacoes() {
    if (!_write(NOTIFICATIONS_KEY, [])) {
      return false;
    }

    _notify('limpar-notificacoes', null);
    return true;
  }


  // =========================================================
  // SALVAMENTO CENTRAL DE RESERVAS
  // =========================================================

  /**
   * Salva a lista de reservas,
   * registra uma notificação
   * e sincroniza as telas.
   */
  function _saveReservas(
    lista,
    action,
    reserva
  ) {
    const salvou = _write(
      STORAGE_KEY,
      lista
    );

    if (!salvou) {
      return false;
    }


    _registrarNotificacao(
      action,
      reserva
    );


    _notify(
      action,
      reserva
    );


    return true;
  }


  // =========================================================
  // CRIAÇÃO DE RESERVAS
  // =========================================================

  /**
   * Armazena temporariamente os dados
   * do formulário antes de confirmar a reserva.
   */
  function stageReserva(formEl) {
    const categoriaEl = document.querySelector(
      '.category-card h3'
    );


    const categoria = categoriaEl
      ? categoriaEl.textContent.trim()
      : 'Reserva';


    const item =
      sessionStorage.getItem(SALA_KEY)
      || categoria;


    /**
     * Busca o valor de um campo pelo ID.
     */
    const getVal = (id) => {
      const el = formEl.querySelector(
        '#' + id
      );

      return el
        ? el.value.trim()
        : '';
    };


    const rascunho = {
      categoria,

      item,

      professor: getVal('nomeProfessor'),

      curso: getVal('curso'),

      motivo: getVal('motivo'),

      data: getVal('data'),

      horaEntrada: getVal('horaEntrada'),

      horaSaida: getVal('horaSaida')
    };


    sessionStorage.setItem(
      TEMP_KEY,
      JSON.stringify(rascunho)
    );
  }


  /**
   * Confirma e salva uma reserva
   * que estava armazenada temporariamente.
   */
  function commitStagedReserva() {
    const raw = sessionStorage.getItem(
      TEMP_KEY
    );


    if (!raw) {
      return null;
    }


    let rascunho;


    try {
      rascunho = JSON.parse(raw);

    } catch (e) {
      sessionStorage.removeItem(TEMP_KEY);

      return null;
    }


    const reserva = {
      ...rascunho,

      id: _uid(),

      status: 'aguardando',

      criadoEm: new Date().toISOString(),

      atualizadoEm: new Date().toISOString()
    };


    const lista = getReservas();


    // Adiciona a reserva no início da lista
    lista.unshift(reserva);


    _saveReservas(
      lista,
      'criar',
      reserva
    );


    // Limpa os dados temporários
    sessionStorage.removeItem(TEMP_KEY);

    sessionStorage.removeItem(SALA_KEY);


    return reserva;
  }


  // =========================================================
  // EDIÇÃO DE RESERVAS
  // =========================================================

  function updateReserva(
    id,
    alteracoes = {}
  ) {
    const lista = getReservas();


    const index = lista.findIndex(
      (reserva) => reserva.id === id
    );


    if (index < 0) {
      return null;
    }


    const reserva = {
      ...lista[index],

      ...alteracoes,

      id,

      atualizadoEm: new Date().toISOString()
    };


    lista[index] = reserva;


    return _saveReservas(
      lista,
      'editar',
      reserva
    )
      ? reserva
      : null;
  }


  // =========================================================
  // CANCELAMENTO
  // =========================================================

  function cancelReserva(id) {
    const lista = getReservas();


    const index = lista.findIndex(
      (reserva) => reserva.id === id
    );


    if (index < 0) {
      return false;
    }


    const reserva = {
      ...lista[index],

      status: 'cancelada',

      canceladoEm: new Date().toISOString(),

      atualizadoEm: new Date().toISOString()
    };


    lista[index] = reserva;


    return _saveReservas(
      lista,
      'cancelar',
      reserva
    );
  }


  // =========================================================
  // STATUS
  // =========================================================

  function statusInfo(status) {
    switch (status) {
      case 'aprovada':
        return {
          label: 'Aprovada',
          badgeClass: 'badge-green'
        };


      case 'negado':
        return {
          label: 'Negado',
          badgeClass: 'badge-red'
        };


      case 'cancelada':
        return {
          label: 'Cancelada',
          badgeClass: 'badge-red'
        };


      default:
        return {
          label: 'Aguardando...',
          badgeClass: 'badge-yellow'
        };
    }
  }


  // =========================================================
  // FORMATAÇÃO
  // =========================================================

  /**
   * Converte:
   *
   * 2026-09-10
   *
   * para:
   *
   * 10/09/2026
   */
  function formatDateBR(isoDate) {
    if (!isoDate) {
      return '';
    }


    const partes = isoDate.split('-');


    return partes.length === 3
      ? `${partes[2]}/${partes[1]}/${partes[0]}`
      : isoDate;
  }


  /**
   * Formata o horário da reserva.
   */
  function formatHorario(
    entrada,
    saida
  ) {
    if (!entrada && !saida) {
      return '';
    }


    return `${entrada || '--:--'} às ${saida || '--:--'}`;
  }


  // =========================================================
  // CONSULTAS
  // =========================================================

  /**
   * Retorna todas as reservas
   * de uma determinada data.
   */
  function getReservasPorData(isoDate) {
    return getReservas().filter(
      (reserva) =>
        reserva.data === isoDate
    );
  }


  // =========================================================
  // CALENDÁRIO
  // =========================================================

  const MESES = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro'
  ];


  /**
   * Adiciona zero à esquerda.
   *
   * Exemplo:
   * 5 → 05
   */
  function _pad2(n) {
    return n < 10
      ? '0' + n
      : '' + n;
  }


  /**
   * Cria uma data no formato ISO.
   *
   * Exemplo:
   * 2026-09-10
   */
  function toISODate(
    ano,
    mesIndex,
    dia
  ) {
    return `${ano}-${_pad2(mesIndex + 1)}-${_pad2(dia)}`;
  }


  /**
   * Retorna a data atual
   * no formato ISO.
   */
  function todayISO() {
    const hoje = new Date();

    return toISODate(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate()
    );
  }


  /**
   * Retorna o nome do mês.
   *
   * Exemplo:
   * Setembro 2026
   */
  function mesLabel(
    ano,
    mesIndex
  ) {
    return `${MESES[mesIndex]} ${ano}`;
  }


  /**
   * Constrói a matriz de células
   * utilizada para renderizar o calendário mensal.
   */
  function construirMatrizMes(
    ano,
    mesIndex
  ) {
    const primeiroDia = new Date(
      ano,
      mesIndex,
      1
    );


    // Dia da semana do primeiro dia
    const inicio = primeiroDia.getDay();


    // Quantidade de dias do mês atual
    const dias = new Date(
      ano,
      mesIndex + 1,
      0
    ).getDate();


    // Quantidade de dias do mês anterior
    const anterior = new Date(
      ano,
      mesIndex,
      0
    ).getDate();


    const celulas = [];


    // ---------------------------------------------------------
    // DIAS DO MÊS ANTERIOR
    // ---------------------------------------------------------

    for (let i = 0; i < inicio; i++) {
      const dia =
        anterior - inicio + 1 + i;


      const d = new Date(
        ano,
        mesIndex - 1,
        dia
      );


      celulas.push({
        dia,

        iso: toISODate(
          d.getFullYear(),
          d.getMonth(),
          dia
        ),

        mesAtual: false
      });
    }


    // ---------------------------------------------------------
    // DIAS DO MÊS ATUAL
    // ---------------------------------------------------------

    for (
      let dia = 1;
      dia <= dias;
      dia++
    ) {
      celulas.push({
        dia,

        iso: toISODate(
          ano,
          mesIndex,
          dia
        ),

        mesAtual: true
      });
    }


    // ---------------------------------------------------------
    // DIAS DO PRÓXIMO MÊS
    // ---------------------------------------------------------

    const restante =
      celulas.length % 7;


    if (restante) {
      for (
        let dia = 1;
        dia <= 7 - restante;
        dia++
      ) {
        const d = new Date(
          ano,
          mesIndex + 1,
          dia
        );


        celulas.push({
          dia,

          iso: toISODate(
            d.getFullYear(),
            d.getMonth(),
            dia
          ),

          mesAtual: false
        });
      }
    }


    return celulas;
  }


  // =========================================================
  // API PÚBLICA DO MÓDULO
  // =========================================================

  _setupNotificationIndicators();

  return {
    // Leitura
    getReservas,
    getNotificacoes,
    hasNotificacoes: () => getNotificacoes().length > 0,

    // Eventos
    subscribe,

    // Reservas
    stageReserva,
    commitStagedReserva,
    updateReserva,
    cancelReserva,
    deleteReserva,

    // Notificações
    deleteNotificacao,
    clearNotificacoes,

    // Status
    statusInfo,

    // Formatação
    formatDateBR,
    formatHorario,

    // Consultas
    getReservasPorData,

    // Calendário
    toISODate,
    todayISO,
    mesLabel,
    construirMatrizMes,
    MESES
  };
})();
