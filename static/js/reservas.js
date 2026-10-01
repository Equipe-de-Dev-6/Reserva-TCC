/**
 * reservas.js
 *
 * Estado compartilhado das reservas.
 *
 * Persistência:
<<<<<<< HEAD
 * - no localStorage, para que a reserva continue existindo
 *   depois de recarregar a página
 *
 * O localStorage guarda a lista no navegador. Quando existir o
 * backend de reservas, basta trocar _read/_write pelas chamadas
 * da API, como já está previsto neste arquivo.
=======
 * - no banco, através das rotas /reservas
 *
 * A reserva é criada pelo professor em POST /reservas e entra com
 * o status "aguardando". Quem libera é o administrador, em
 * PATCH /reservas/{id}/decisao.
 *
 * A lista que fica na tela é uma cópia em memória: a API continua
 * sendo a fonte da verdade e carregar() busca de novo sempre que
 * uma reserva muda.
>>>>>>> main
 *
 * Sincronização entre abas:
 * - BroadcastChannel
 *
 * Nenhuma tela precisa ser recarregada: a reserva criada pelo
 * professor aparece na tela do administrador e a decisão do
 * administrador volta para a tela do professor.
 */

import {
    listarReservas,
    criarReserva,
    cancelarReserva
} from '/js/api.js';

const ReservasApp = (() => {
  // =========================================================
  // CONFIGURAÇÕES E ESTADO EM MEMÓRIA
  // =========================================================

  // O sessionStorage é usado apenas para transportar a escolha
  // entre as três páginas do agendamento (passo 01 -> 02 -> 03).
  // Ele não guarda a lista de reservas e some ao fechar a aba.
  const SALA_KEY = 'salaSelecionada';
  const TEMP_KEY = 'senai_nova_reserva';

  const CHANNEL_NAME = 'senai-reservas-sync';

  const channel =
    typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(CHANNEL_NAME)
      : null;

  const listeners = [];

  // =========================================================
  // ESTADO
  // =========================================================

  // Recupera as listas que já estavam salvas no navegador.
  // Assim, a reserva continua na tela mesmo depois de recarregar.
  let reservas = _read('reservas', []);
  let notificacoes = _read('notificacoes', []);


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
   * Lê uma lista do estado.
   *
   * Busca no localStorage e, se não houver nada salvo ainda,
   * devolve o valor padrão. É por aqui que a troca pela API
   * será feita no futuro.
   */
  function _read(key, fallback = []) {
    try {
      const bruto = localStorage.getItem(key);

      if (!bruto) {
        return fallback;
      }

      const dados = JSON.parse(bruto);

      return Array.isArray(dados) ? dados : fallback;

    } catch (e) {
      console.error(
        'Erro ao ler as reservas salvas:',
        e
      );

      return fallback;
    }
  }


  /**
   * Grava uma lista no estado e no localStorage.
   *
   * O valor é copiado para uma nova lista, evitando que a tela
   * segure uma referência que muda por baixo dos panos.
   */
  function _write(key, value) {
    const copia = Array.isArray(value) ? [...value] : value;

    try {
      localStorage.setItem(
        key,
        JSON.stringify(copia)
      );

    } catch (e) {
      console.warn(
        'Não foi possível salvar as reservas:',
        e
      );
    }

    if (key === 'reservas') {
      reservas = copia;
    }

    if (key === 'notificacoes') {
      notificacoes = copia;
    }

    return true;
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
   * Aplica na lista desta aba a alteração que veio de outra.
   *
   * É o que faz a reserva criada na tela do professor aparecer
   * na tela do administrador, e a decisão do administrador
   * voltar para a tela do professor.
   */
  function _aplicarDeOutraAba(payload) {
    const reserva = payload.reserva;

    // Sem reserva não há o que aplicar. 'excluir-notificacao'
    // e 'limpar-notificacoes' também passam por aqui.
    if (!reserva || !reserva.id) {
      return;
    }

    const lista = getReservas();

    const existe = lista.some(
      (item) => item.id === reserva.id
    );

    // Reserva nova feita em outra aba
    if (payload.action === 'criar' && !existe) {
      _write(
        'reservas',
        [reserva, ...lista]
      );

      return;
    }

    // Reserva excluída em outra aba
    if (payload.action === 'excluir' && existe) {
      _write(
        'reservas',
        lista.filter(
          (item) => item.id !== reserva.id
        )
      );

      return;
    }

    // Reserva editada, cancelada, aprovada ou rejeitada
    // em outra aba
    if (existe) {
      _write(
        'reservas',
        lista.map((item) => {

          return item.id === reserva.id
            ? { ...item, ...reserva }
            : item;

        })
      );
    }
  }


  /**
   * BroadcastChannel:
   * sincroniza alterações entre abas abertas.
   */
  if (channel) {
    channel.addEventListener(
      'message',
      (event) => {

        const payload = event.data || {};

        _aplicarDeOutraAba(payload);

        _onChange(payload);

      }
    );
  }


  /**
   * Fallback utilizando o evento storage.
   */
  // O evento "storage" observa o localStorage compartilhado
  // entre abas e cobre o caso de uma aba que estava fechada
  // quando a reserva foi salva.
  window.addEventListener(
    'storage',
    (event) => {

      if (!event.key || event.key !== 'reservas') {
        return;
      }

      _write(
        'reservas',
        _read('reservas')
      );

      _onChange({ action: 'sincronizar' });

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
    return reservas;
  }


  function getNotificacoes() {
    return notificacoes;
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
      'notificacoes',
      notificacoes.slice(0, 100)
    );
  }


  /**
   * Exclui uma reserva definitivamente do armazenamento local.
   * As notificações ligadas a ela também são removidas.
   *
   * A reserva continua existindo no banco: o DELETE em
   * /reservas/{id} marca o status como "cancelada", em vez de
   * apagar o histórico. Só a cópia da tela sai da lista.
   */
  async function deleteReserva(id) {
    const lista = getReservas();
    const existe = lista.some((reserva) => reserva.id === id);

    if (!existe) {
      return false;
    }


    try {

      const cancelada = await cancelarReserva(id);

      reservas = getReservas().map((item) => (
        item.id === id ? adaptarReserva(cancelada) : item
      ));

    } catch (erro) {

      console.error(
        'Erro ao cancelar a reserva:',
        erro
      );

      return false;

    }


    _write(
      'notificacoes',
      getNotificacoes().filter((notificacao) => notificacao.reservaId !== id)
    );

    _notify('cancelar', { id });
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
      'notificacoes',
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
    if (!_write('notificacoes', [])) {
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
      'reservas',
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
   * Recupera a sala escolhida na tela anterior.
   *
   * A tela de escolha grava o json devolvido pela API
   * ({ id, nome, contexto }). O nome é usado para exibir
   * na reserva.
   */
  function lerSalaSelecionada() {
    const bruto = sessionStorage.getItem(SALA_KEY);

    if (!bruto) {
      return '';
    }

    try {
      const sala = JSON.parse(bruto);

      return sala && sala.nome ? sala.nome : '';

    } catch (e) {
      // Formato antigo, em que era gravado apenas o nome.
      return bruto;
    }
  }


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


    const item = lerSalaSelecionada() || categoria;


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
   *
   * A gravação acontece na API. O id e o status devolvidos pelo
   * banco substituem os valores montados aqui, para que a tela
   * passe a trabalhar com o registro que realmente foi salvo.
   */
  async function commitStagedReserva() {
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


    // A sala escolhida na tela anterior é lida de novo, porque o
    // id é o que a API usa para amarrar a reserva na sala.
    const sala = _lerSalaSelecionada();

    if (!sala || !sala.id) {

      sessionStorage.removeItem(TEMP_KEY);

      return {
        erro: 'Escolha uma sala antes de confirmar a reserva.'
      };

    }


    if (!rascunho.data) {

      return {
        erro: 'Informe a data da reserva.'
      };

    }


    try {

      const criada = await criarReserva({
        sala_id: sala.id,

        // A data e os horários vão em campos separados: a API
        // junta os dois em um único timestamp.
        data_inicio: rascunho.data,
        data_fim: rascunho.data,

        hora_entrada: rascunho.horaEntrada || '',
        hora_saida: rascunho.horaSaida || '',

        categoria: rascunho.categoria || '',
        item: rascunho.item || '',

        professor: rascunho.professor || '',
        curso: rascunho.curso || '',
        motivo: rascunho.motivo || ''
      });


      const reserva = adaptarReserva(criada);


      _registrarNotificacao(
        'criar',
        reserva
      );


      _notify(
        'criar',
        reserva
      );


      sessionStorage.removeItem(TEMP_KEY);
      sessionStorage.removeItem(SALA_KEY);

      return reserva;

    } catch (erro) {

      // A mensagem vem da API (sala indisponível, horário
      // ocupado, dado inválido) e é mostrada na tela.
      return {
        erro: erro.message
      };

    }
  }


  /**
   * Lê a sala escolhida, incluindo o id.
   */
  function _lerSalaSelecionada() {

    const bruto = sessionStorage.getItem(SALA_KEY);

    if (!bruto) {
      return null;
    }

    try {
      return JSON.parse(bruto);

    } catch (e) {

      return null;

    }

  }


  /**
   * Busca as reservas do usuário logado na API
   * e guarda o resultado em memória para as telas.
   */
  async function carregar() {

    try {

      const lista = await listarReservas();

      reservas = lista.map(adaptarReserva);

      return reservas;

    } catch (erro) {

      console.error(
        'Erro ao carregar as reservas:',
        erro
      );

      return [];

    }

  }


  // =========================================================
  // EDIÇÃO DE RESERVAS
  // =========================================================

  /**
   * Altera uma reserva que ainda não foi respondida.
   *
   * Quem decide o status de uma reserva é o administrador,
   * em /reservas/{id}/decisao. Esta função serve para os
   * campos do professor (curso, motivo), que são corrigidos
   * antes da aprovação.
   */
  async function updateReserva(
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


    const atual = lista[index];


    // Reserva já respondida pelo administrador fica travada,
    // porque o histórico da decisão não deve ser reescrito.
    if (atual.status && atual.status !== 'aguardando') {

      return {
        erro: 'Esta reserva já foi respondida e não pode ser alterada.'
      };

    }


    // A API não tem rota de edição parcial da reserva: o
    // cancelamento é a única mudança de status permitida ao
    // professor, então qualquer outro ajuste exige refazer
    // o pedido pela tela de reserva.
    if (alteracoes.status && alteracoes.status !== 'aguardando') {

      return {
        erro: 'Somente o administrador pode decidir uma reserva.'
      };

    }


    return {
      erro: 'Para corrigir uma reserva, cancele e faça um novo pedido.'
    };

  }


  // =========================================================
  // CANCELAMENTO
  // =========================================================

  /**
   * Cancela uma reserva que ainda não foi respondida.
   *
   * É o mesmo caminho de deleteReserva, que chama o DELETE
   * em /reservas/{id} e marca o status no banco.
   */
  async function cancelReserva(id) {
    return await deleteReserva(id);
  }


  // =========================================================
  // ADAPTAÇÃO ENTRE O BANCO E A TELA
  // =========================================================

  /**
   * Converte a reserva do banco no formato usado pelas telas.
   *
   * A API devolve data_inicio e data_fim em timestamp completo
   * ("2026-09-10T08:00:00"), enquanto as telas esperam a data
   * separada ("2026-09-10") e as horas em "horaEntrada" e
   * "horaSaida". Esta função faz essa tradução, para que os
   * cards, o calendário e as notificações continuem usando os
   * mesmos campos de antes sem precisar mudar.
   */
  function adaptarReserva(reserva) {

    if (!reserva) {
      return null;
    }


    const inicio = String(
      reserva.data_inicio || reserva.data || ''
    );

    const fim = String(
      reserva.data_fim || ''
    );


    return {
      ...reserva,

      // A data vem do início da reserva. Sem data_inicio, cai
      // no campo "data", que é o formato do rascunho local.
      data: inicio ? inicio.slice(0, 10) : '',

      // "2026-09-10T08:00:00" vira "08:00".
      horaEntrada: inicio.length >= 16 ? inicio.slice(11, 16) : '',

      horaSaida: fim.length >= 16 ? fim.slice(11, 16) : '',

      // O banco chama de sala_id; as telas esperam o nome.
      item: reserva.item || reserva.sala_nome || '',

      criadoEm: reserva.criado_em || reserva.criadoEm || '',
      atualizadoEm: reserva.atualizado_em || reserva.atualizadoEm || ''
    };

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
          label: 'Negada',
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
    carregar,
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
