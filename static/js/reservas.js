// ============================================================
// reservas.js
// ============================================================
//
// Estado e persistência das reservas.
//
// Como funciona:
//
// 1. A reserva é montada em três passos. O passo 01 escolhe a sala
//    (o "escolherreservaprof.js" guarda o nome em sessionStorage,
//    na chave "salaSelecionada"). O passo 02 chama
//    stageReserva(), que guarda o rascunho. O passo 03 chama
//    commitStagedReserva(), que transforma o rascunho em reserva
//    com status "aguardando".
//
// 2. As reservas ficam no banco (tabela "reservas", via /reservas),
//    e não em memória como os avisos. O navegador guarda uma cópia
//    no localStorage para que a tela abra rápido e continue
//    funcionando se o servidor estiver fora do ar; quando a API
//    responde, quem manda é o banco.
//
// 3. As leituras são síncronas de propósito: as telas já chamam
//    getReservas() direto no render. A sincronização com a API roda
//    por baixo, sem travar a interface.
//
// 4. Reservas criadas enquanto a API estava fora do ar ficam na
//    lista "pendentes" do localStorage e são reenviadas sozinhas na
//    próxima vez que a página abre.
//
// 5. ReservasApp.subscribe(fn) permite que uma página "escute"
//    mudanças e sempre se re-renderize sem chamar o render na mão.
//
// ============================================================

const ReservasApp = (() => {

  // ========================================================
  // CHAVES
  // ========================================================

  const CHAVE_RESERVAS = 'reservasSenai';

  // Rascunho entre o passo 02 e o passo 03. Fica no sessionStorage
  // de propósito: ele não deve sobreviver ao fim do fluxo, senão
  // uma reserva abandonada reaparece no dia seguinte.
  const CHAVE_RASCUNHO = 'reservaRascunhoSenai';

  // Guarda a chave escrita pelo "escolherreservaprof.js".
  const CHAVE_SALA = 'salaSelecionada';

  const CHAVE_NOTIFICACOES = 'reservasNotificacoesSenai';

  const CHAVE_PENDENTES = 'reservasPendentesSenai';

  // A lista de notificações é uma_ws notificação para cada ação
  // recente. Passar disso só ocupa espaço sem ajudar a tela.
  const LIMITE_NOTIFICACOES = 50;

  const STATUS_AGUARDANDO = 'aguardando';
  const STATUS_APROVADA = 'aprovada';
  const STATUS_NEGADA = 'negada';
  const STATUS_CANCELADA = 'cancelada';

  // Rótulo e cor de cada status. As classes são as que existem em
  // "badge-green", "badge-red" e "badge-yellow" no CSS.
  const STATUS = {
    [STATUS_AGUARDANDO]: { label: 'Aguardando', badgeClass: 'badge-yellow' },
    [STATUS_APROVADA]: { label: 'Aprovada', badgeClass: 'badge-green' },
    [STATUS_NEGADA]: { label: 'Recusada', badgeClass: 'badge-red' },
    [STATUS_CANCELADA]: { label: 'Cancelada', badgeClass: 'badge-red' }
  };

  // Categorias reconhecidas na tela de reservas.
  //
  // A classificação é feita pelo servidor (app.py decide a partir da
  // descrição da sala) e chega aqui pronta, no campo "categoria" do
  // recurso escolhido. Estas constantes servem só como lista de
  // fallback para quando a tela de escolha gravou o nome sem
  // categoria.
  const CATEGORIAS = [
    { chave: 'laboratorio', rotulo: 'Laboratório' },
    { chave: 'gabinete', rotulo: 'Gabinete' },
    { chave: 'sala', rotulo: 'Sala' }
  ];

  const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // A semana do calendário começa no domingo, como o cabeçalho
  // "Dom Seg Ter Qua Qui Sex Sáb" de "calendarioprof.html".
  const DIAS_DA_SEMANA = 7;

  // ========================================================
  // ESTADO
  // ========================================================

  // Fica null até a primeira leitura, para que o localStorage só
  // seja aberto uma vez.
  let reservas = null;

  let notificacoes = null;

  const listeners = [];


  // ========================================================
  // ARMAZENAMENTO LOCAL
  // ========================================================

  function _ler(chave, padrao) {

    try {

      const bruto = localStorage.getItem(chave);

      return bruto === null ? padrao : JSON.parse(bruto);

    } catch (e) {

      // localStorage indisponível ou JSON corrompido: a aplicação
      // continua funcionando só com a API.
      return padrao;

    }

  }


  function _gravar(chave, valor) {

    try {

      localStorage.setItem(chave, JSON.stringify(valor));

      return true;

    } catch (e) {

      return false;

    }

  }


  function _lerRascunho() {

    try {

      const bruto = sessionStorage.getItem(CHAVE_RASCUNHO);

      return bruto === null ? null : JSON.parse(bruto);

    } catch (e) {

      return null;

    }

  }


  function _gravarRascunho(valor) {

    try {

      if (valor === null) {

        sessionStorage.removeItem(CHAVE_RASCUNHO);

      } else {

        sessionStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(valor));

      }

    } catch (e) {

      // Sem rascunho guardado, a confirmação do passo 03 não tem o
      // que confirmar. A tela avisa e o professor refaz o passo 02.

    }

  }


  // A sala escolhida é gravada por telas diferentes, e cada uma usa um
  // formato: o "salas.js" (telas de salas e laboratórios) grava um
  // objeto com id, nome e contexto, porque o card vem do banco; a tela
  // de gabinetes grava só o nome, porque ainda não há gabinetes
  // cadastrados. As duas formas são aceitas aqui para que o passo 02
  // funcione nas duas.
  function _lerSalaEscolhida() {

    try {

      const bruto = sessionStorage.getItem(CHAVE_SALA) || '';

      if (!bruto) {

        return { nome: '', id: null, categoria: '' };

      }

      if (bruto.trimStart().startsWith('{')) {

        const sala = JSON.parse(bruto);

        return {
          nome: sala.nome || '',
          id: sala.id === undefined ? null : sala.id,
          categoria: sala.categoria || ''
        };

      }

      return { nome: bruto, id: null, categoria: '' };

    } catch (e) {

      return { nome: '', id: null, categoria: '' };

    }

  }


  // ========================================================
  // LISTENERS
  // ========================================================

  function _notificar() {

    listeners.forEach((fn) => {

      try {

        fn();

      } catch (e) {

        // Uma tela quebrada não pode impedir as outras de
        // se atualizarem.

      }

    });

  }


  function subscribe(fn) {

    if (typeof fn === 'function') {

      listeners.push(fn);

    }

  }


  // ========================================================
  // API
  // ========================================================

  async function _apiListar() {

    const resposta = await fetch('/reservas', {
      headers: { 'Accept': 'application/json' }
    });

    if (!resposta.ok) {

      throw new Error('Falha ao buscar as reservas');

    }

    const dados = await resposta.json();

    return Array.isArray(dados) ? dados : [];

  }


  // Só os campos que a API recebe. A reserva também carrega o id
  // temporário e a hora de criação, que são do navegador e não
  // têm o que fazer no banco.
  function _payloadApi(reserva) {

    return {
      data: reserva.data || '',
      horaEntrada: reserva.horaEntrada || '',
      horaSaida: reserva.horaSaida || '',
      professor: reserva.professor || '',
      curso: reserva.curso || '',
      motivo: reserva.motivo || '',
      categoria: reserva.categoria || '',
      item: reserva.item || '',
      salaId: reserva.salaId === undefined ? null : reserva.salaId
    };

  }


  async function _apiCriar(reserva) {

    const resposta = await fetch('/reservas', {
      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(_payloadApi(reserva))
    });

    if (!resposta.ok) {

      throw new Error('Falha ao registrar a reserva');

    }

    return resposta.json();

  }


  async function _apiDecidir(id, decisao) {

    const resposta = await fetch(`/reservas/${id}/decisao`, {
      method: 'PATCH',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ decisao: decisao })
    });

    if (!resposta.ok) {

      throw new Error('Falha ao mudar o status da reserva');

    }

    return resposta.json();

  }


  // ========================================================
  // LEITURA / ESCRITA DAS RESERVAS
  // ========================================================

  function getReservas() {

    if (reservas === null) {

      const guardadas = _ler(CHAVE_RESERVAS, []);

      reservas = Array.isArray(guardadas) ? guardadas : [];

    }

    // Mais recentes primeiro.
    return [...reservas].sort((a, b) => _ordenarPorData(b, a));

  }


  // Ordem da lista: dia da reserva, hora de entrada e, quando os
  // dois empatam, a ordem em que a reserva foi criada.
  function _ordenarPorData(a, b) {

    const chaveA = `${a.data || ''}T${a.horaEntrada || ''}`;
    const chaveB = `${b.data || ''}T${b.horaEntrada || ''}`;

    if (chaveA !== chaveB) {

      return chaveA < chaveB ? 1 : -1;

    }

    return String(b.criadoEm || '').localeCompare(String(a.criadoEm || ''));

  }


  function _salvarReservas(lista) {

    // Guarda uma cópia, para que a tela não segure uma
    // referência que muda por baixo dos panos.
    reservas = [...lista];

    _gravar(CHAVE_RESERVAS, reservas);

    return true;

  }


  function _pendentes() {

    const guardadas = _ler(CHAVE_PENDENTES, []);

    return Array.isArray(guardadas) ? guardadas : [];

  }


  function _marcarPendente(reserva) {

    _gravar(CHAVE_PENDENTES, [..._pendentes(), reserva]);

  }


  function _limparPendente(id) {

    _gravar(
      CHAVE_PENDENTES,
      _pendentes().filter((r) => r.id !== id)
    );

  }


  // ========================================================
  // SINCRONIZAÇÃO COM O BANCO
  // ========================================================

  async function sincronizar() {

    let remotas;

    try {

      remotas = await _apiListar();

    } catch (e) {

      // Sem resposta da API (sem sessão ou servidor fora do ar):
      // a cópia local continua valendo e nada é descartado.
      return false;

    }

    // O banco é a fonte da verdade. As reservas que só existem
    // aqui ainda estão na fila de envio, então entram no fim em vez
    // de sumir da tela.
    const idsRemotos = new Set(remotas.map((r) => String(r.id)));

    const locais = getReservas().filter(
      (r) => !idsRemotos.has(String(r.id))
    );

    _salvarReservas([...remotas, ...locais]);

    // Reenvia o que ficou para trás na última sessão.
    await _reenviarPendentes();

    _notificar();

    return true;

  }


  async function _reenviarPendentes() {

    for (const reserva of _pendentes()) {

      try {

        const gravada = await _apiCriar(reserva);

        _limparPendente(reserva.id);

        _substituirReserva(reserva.id, gravada);

      } catch (e) {

        // Continua na fila para a próxima tentativa.

      }

    }

  }


  function _substituirReserva(id, nova) {

    if (nova === null) {

      return;

    }

    const lista = getReservas().map((r) => (r.id === id ? nova : r));

    _salvarReservas(lista);

  }


  // ========================================================
  // CATEGORIA
  // ========================================================

  function _categoriaDoRecurso(recurso) {

    // A tela de escolha ja gravou a categoria, classificada pelo
    // servidor. Nao ha mais conta a fazer a partir do texto da sala:
    // quando o recurso vem sem categoria, o padrao e Sala.
    if (recurso.categoria) {

      return recurso.categoria;

    }

    return CATEGORIAS.find((c) => c.chave === 'sala').rotulo;

  }


  // ========================================================
  // RASCUNHO (PASSO 01 -> 03)
  // ========================================================

  function stageReserva(formulario) {

    if (!formulario) {

      return null;

    }

    const recurso = _lerSalaEscolhida();

    const valor = (nome) => {

      const campo = formulario.querySelector(`[name="${nome}"]`);

      return campo ? campo.value.trim() : '';

    };

    const rascunho = {
      item: recurso.nome,
      categoria: _categoriaDoRecurso(recurso),
      salaId: recurso.id,
      professor: valor('nomeProfessor'),
      curso: valor('curso'),
      motivo: valor('motivo'),
      data: valor('data'),
      horaEntrada: valor('horaEntrada'),
      horaSaida: valor('horaSaida')
    };

    // Sem sala escolhida não há o que reservar, e sem data ou
    // horário a reserva não tem quando acontecer.
    if (
      !rascunho.item ||
      !rascunho.data ||
      !rascunho.horaEntrada ||
      !rascunho.horaSaida
    ) {

      _gravarRascunho(null);

      return null;

    }

    _gravarRascunho(rascunho);

    return rascunho;

  }


  function commitStagedReserva() {

    const rascunho = _lerRascunho();

    if (!rascunho) {

      // Não há rascunho: o professor chegou aqui sem passar pelo
      // passo 02. Nada é criado, para não inventar uma reserva.
      return null;

    }

    // Só é removido depois de montado o rascunho, e não antes, para
    // que uma falha não apague o que o professor preencheu.
    _gravarRascunho(null);

    const reserva = {
      id: _uid('r'),
      data: rascunho.data,
      horaEntrada: rascunho.horaEntrada,
      horaSaida: rascunho.horaSaida,
      status: STATUS_AGUARDANDO,
      categoria: rascunho.categoria,
      item: rascunho.item,
      // Vem nulo quando a tela de escolha gravou só o nome (gabinetes).
      // A API usa o id para vincular a reserva à sala e passar a valer a
      // trava de horário do banco.
      salaId: rascunho.salaId === undefined ? null : rascunho.salaId,
      professor: rascunho.professor,
      curso: rascunho.curso,
      motivo: rascunho.motivo,
      criadoEm: new Date().toISOString()
    };

    _salvarReservas([...getReservas(), reserva]);

    _registrarNotificacao('criar', reserva);

    _notificar();

    _enviarParaAPI(reserva);

    return reserva;

  }


  async function _enviarParaAPI(reserva) {

    try {

      const gravada = await _apiCriar(reserva);

      _limparPendente(reserva.id);

      _substituirReserva(reserva.id, gravada);

      _notificar();

      return true;

    } catch (e) {

      // A reserva fica na fila para ser reenviada, em vez de
      // desaparecer da tela de quem a criou.
      _marcarPendente(reserva);

      return false;

    }

  }


  // ========================================================
  // MUDAR STATUS / EXCLUIR
  // ========================================================

  function cancelReserva(id) {

    return _mudarStatus(id, STATUS_CANCELADA);

  }


  function _mudarStatus(id, status) {

    const lista = getReservas();

    const alvo = lista.find((r) => r.id === id);

    if (!alvo || alvo.status === STATUS_CANCELADA) {

      return false;

    }

    const atualizada = { ...alvo, status: status };

    _salvarReservas(lista.map((r) => (r.id === id ? atualizada : r)));

    _registrarNotificacao('cancelar', atualizada);

    _notificar();

    // Cancelar é uma decisão do dono da reserva (o administrador
    // também pode), por isso vai pela mesma rota de decisão.
    if (String(id).startsWith('r_')) {

      return true;

    }

    _apiDecidir(id, status).catch(() => {

      // Sem API, a mudança continua só na cópia local.

    });

    return true;

  }


  function deleteReserva(id) {

    const lista = getReservas();

    if (!lista.some((r) => r.id === id)) {

      return false;

    }

    _salvarReservas(lista.filter((r) => r.id !== id));

    // Se a reserva nunca chegou ao banco, também sai da fila de
    // envio: ela não existe em lugar nenhum agora.
    _limparPendente(id);

    _notificar();

    return true;

  }


  function getReservasPorData(iso) {

    return getReservas()
      .filter((r) => r.data === iso)
      .sort((a, b) => String(a.horaEntrada).localeCompare(String(b.horaEntrada)));

  }


  // ========================================================
  // CALENDÁRIO
  // ========================================================

  function construirMatrizMes(ano, mes) {

    // "mes" é zero-based, como o "new Date().getMonth()".
    const primeiroDia = new Date(ano, mes, 1);

    // A grade sempre mostra seis semanas inteiras, para que a
    // altura do calendário não mude de mês para mês.
    const totalCelulas = DIAS_DA_SEMANA * 6;

    const celulas = [];

    // O primeiro domingo visível pode estar no mês anterior.
    const inicio = new Date(
      primeiroDia.getFullYear(),
      primeiroDia.getMonth(),
      1 - primeiroDia.getDay()
    );

    for (let i = 0; i < totalCelulas; i++) {

      const dia = new Date(
        inicio.getFullYear(),
        inicio.getMonth(),
        inicio.getDate() + i
      );

      celulas.push({
        iso: toISODate(dia),
        dia: dia.getDate(),
        mesAtual: dia.getMonth() === mes
      });

    }

    return celulas;

  }


  function mesLabel(ano, mes) {

    return `${MESES[mes] || ''} ${ano}`;

  }


  // ========================================================
  // DATAS
  // ========================================================

  // toISOString() converte para UTC e, no Brasil, joga a data para
  // o dia anterior. Aqui a data é montada à mão, no horário local.
  function toISODate(data) {

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;

  }


  function todayISO() {

    return toISODate(new Date());

  }


  function formatDateBR(isoDate) {

    if (!isoDate) {

      return '';

    }

    const partes = String(isoDate).split('-');

    if (partes.length !== 3) {

      return isoDate;

    }

    const [ano, mes, dia] = partes;

    return `${dia}/${mes}/${ano}`;

  }


  function formatHorario(entrada, saida) {

    if (!entrada && !saida) {

      return '';

    }

    if (!entrada) {

      return `até ${saida}`;

    }

    if (!saida) {

      return `a partir de ${entrada}`;

    }

    return `${entrada} às ${saida}`;

  }


  // ========================================================
  // STATUS
  // ========================================================

  function statusInfo(status) {

    return (
      STATUS[status] || {
        label: status || 'Aguardando',
        badgeClass: 'badge-yellow'
      }
    );

  }


  // ========================================================
  // NOTIFICAÇÕES
  // ========================================================

  function getNotificacoes() {

    if (notificacoes === null) {

      const guardadas = _ler(CHAVE_NOTIFICACOES, []);

      notificacoes = Array.isArray(guardadas) ? guardadas : [];

    }

    // Mais recentes primeiro.
    return [...notificacoes].sort(
      (a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm))
    );

  }


  function hasNotificacoes() {

    return getNotificacoes().length > 0;

  }


  function _registrarNotificacao(action, reserva) {

    getNotificacoes();

    // Copia os campos da reserva: se a lista mudar depois, a
    // notificação continua descrevendo o que aconteceu.
    notificacoes = [
      {
        id: _uid('n'),
        action: action,
        reserva: { ...reserva },
        criadoEm: new Date().toISOString()
      },
      ...notificacoes
    ].slice(0, LIMITE_NOTIFICACOES);

    _gravar(CHAVE_NOTIFICACOES, notificacoes);

  }


  function deleteNotificacao(id) {

    notificacoes = getNotificacoes().filter((n) => n.id !== id);

    _gravar(CHAVE_NOTIFICACOES, notificacoes);

    return true;

  }


  function clearNotificacoes() {

    notificacoes = [];

    _gravar(CHAVE_NOTIFICACOES, notificacoes);

    return true;

  }


  // ========================================================
  // INTERNOS
  // ========================================================

  function _uid(prefixo) {

    return (
      prefixo +
      '_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 7)
    );

  }


  // ========================================================
  // EXPORTAÇÕES
  // ========================================================

  return {
    getReservas,
    getReservasPorData,
    construirMatrizMes,

    stageReserva,
    commitStagedReserva,

    cancelReserva,
    deleteReserva,

    statusInfo,

    MESES,
    mesLabel,
    todayISO,
    toISODate,
    formatDateBR,
    formatHorario,

    getNotificacoes,
    hasNotificacoes,
    deleteNotificacao,
    clearNotificacoes,

    subscribe,
    sincronizar
  };

})();


// ============================================================
// SINCRONIZAÇÃO INICIAL
// ============================================================
//
// Roda assim que o arquivo é carregado, sem esperar o DOM: as telas
// leem a lista de imediato (a cópia do localStorage) e, quando o
// banco responde, os mesmos listeners são avisados para se
// re-renderizarem.
//
// A promessa fica guardada em "ReservasApp.sincronizacao" para que
// um teste ou uma tela possa esperar o resultado.
ReservasApp.sincronizacao = ReservasApp.sincronizar().catch(() => false);


// ============================================================
// GLOBAL
// ============================================================
//
// O "const" do topo de um script cria um binding no escopo léxico
// global, e não uma propriedade de "window". Quem chama por
// "window.ReservasApp" — como o "notificacoes-push.js" faz para
// conferir se o módulo está carregado — receberia "undefined" e
// desligaria a notificação silenciosamente. Por isso o global é
// publicado explicitamente aqui, e não fica só no const.
window.ReservasApp = ReservasApp;