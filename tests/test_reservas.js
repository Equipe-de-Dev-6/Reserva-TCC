// Teste do ReservasApp fora do navegador: simula localStorage,
// sessionStorage e fetch para ver se o módulo funciona e se a tela
// recebe os dados no formato que ela espera.
const fs = require('fs');
const vm = require('vm');

const CHAVE_RESERVAS = 'reservasSenai';
const CHAVE_RASCUNHO = 'reservaRascunhoSenai';
const CHAVE_NOTIF = 'reservasNotificacoesSenai';
const CHAVE_PEND = 'reservasPendentesSenai';

// ---------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------

function criarStorage() {
  const dados = new Map();

  return {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, String(v)),
    removeItem: (k) => dados.delete(k),
    _raw: dados,
  };
}

function criarContexto({ reservasRemotas, falhaApi }) {
  const localStorage = criarStorage();
  const sessionStorage = criarStorage();

  const chamadas = [];

  async function fetch(url, opcoes = {}) {
    chamadas.push({ url, metodo: (opcoes.method || 'GET').toUpperCase(), corpo: opcoes.body });

    if (falhaApi) {
      throw new Error('rede fora');
    }

    if (url === '/reservas' && (opcoes.method || 'GET') === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => reservasRemotas,
      };
    }

    if (url === '/reservas' && opcoes.method === 'POST') {
      const enviada = JSON.parse(opcoes.body);

      return {
        ok: true,
        status: 201,
        json: async () => ({ ...enviada, id: 999, criadoEm: '2026-10-01T10:00:00' }),
      };
    }

    if (url.includes('/decisao')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 1, status: JSON.parse(opcoes.body).decisao }),
      };
    }

    return { ok: false, status: 404, json: async () => ({}) };
  }

  const contexto = vm.createContext({
    // O modulo publica window.ReservasApp; sem um objeto window no
    // contexto, a atribuicao nao teria onde cair.
    window: {},
    localStorage,
    sessionStorage,
    fetch,
    Set,
    Map,
    Date,
    Math,
    console,
    JSON,
    Promise,
  });

  contexto.__chamadas = chamadas;
  contexto.__localStorage = localStorage;
  contexto.__sessionStorage = sessionStorage;

  return contexto;
}

function carregarReservasJs(contexto) {
  const codigo = fs.readFileSync(__dirname + '/../static/js/reservas.js', 'utf8');

  vm.runInContext(codigo, contexto, { filename: 'reservas.js' });

  // `const` no topo do script cria um binding no escopo do módulo,
  // e não uma propriedade do global: é preciso pedir o valor.
  return vm.runInContext('ReservasApp', contexto);
}

// ---------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------

let passou = 0;
let falhou = 0;

function check(nome, condicao, detalhe) {
  if (condicao) {
    passou++;
    console.log(`  ok   ${nome}`);
  } else {
    falhou++;
    console.log(`  FALHA ${nome}${detalhe ? ' -> ' + detalhe : ''}`);
  }
}

function formulario(campos) {
  return {
    querySelector: (seletor) => {
      const nome = seletor.replace(/\[name="|"\]/g, '');

      return campos[nome] !== undefined ? { value: campos[nome] } : null;
    },
  };
}

async function main() {
  console.log('\n[1] Fluxo completo com API no ar');
  {
    const remoto = [
      {
        id: 7,
        data: '2026-10-20',
        horaEntrada: '08:00',
        horaSaida: '10:00',
        status: 'aprovada',
        categoria: 'Sala',
        item: 'Sala de aula - A01',
        professor: 'Ana',
        curso: 'DS',
        motivo: 'Aula',
        criadoEm: '2026-10-01T09:00:00',
      },
    ];
    const ctx = criarContexto({ reservasRemotas: remoto, falhaApi: false });
    const app = carregarReservasJs(ctx);

    await app.sincronizacao;

    check('lista as reservas vindas do banco', app.getReservas().length === 1, JSON.stringify(app.getReservas()));
    check('campos no formato usado pelas telas', app.getReservas()[0].horaEntrada === '08:00');
    check('cache local gravado', ctx.__localStorage.getItem(CHAVE_RESERVAS) !== null);

    // Passo 01 -> 03
    ctx.__sessionStorage.setItem(
      'salaSelecionada',
      JSON.stringify({ id: 8, nome: 'C08', categoria: 'Laboratório' })
    );
    const rascunho = app.stageReserva(
      formulario({
        nomeProfessor: 'Bruno ',
        curso: 'Elétrica',
        motivo: 'Prática',
        data: '2026-10-21',
        horaEntrada: '13:00',
        horaSaida: '15:00',
      })
    );

    check('rascunho montado', rascunho !== null && rascunho.item === 'C08', JSON.stringify(rascunho && rascunho.item));
    check('categoria vem do servidor', rascunho.categoria === 'Laboratório', rascunho.categoria);
    check('id da sala aproveitado', rascunho.salaId === 8, String(rascunho.salaId));
    check('campos sem espaço nas pontas', rascunho.professor === 'Bruno');
    check('rascunho guardado no sessionStorage', ctx.__sessionStorage.getItem(CHAVE_RASCUNHO) !== null);

    const criada = app.commitStagedReserva();

    check('reserva criada', criada !== null && criada.status === 'aguardando');
    check('rascunho limpo', ctx.__sessionStorage.getItem(CHAVE_RASCUNHO) === null);
    check('reserva na lista', app.getReservas().length === 2);
    check('notificação criada', app.hasNotificacoes() && app.getNotificacoes()[0].action === 'criar');

    await new Promise((r) => setTimeout(r, 10));

    const posts = ctx.__chamadas.filter((c) => c.metodo === 'POST');
    check('POST /reservas disparado', posts.length === 1, JSON.stringify(ctx.__chamadas.map((c) => c.metodo + ' ' + c.url)));
    check('payload sem campo id local', posts[0] && posts[0].corpo.indexOf('"id"') === -1);
    check('id do banco substitui o local', app.getReservas().some((r) => r.id === 999));
    check('nada na fila de pendentes', JSON.parse(ctx.__localStorage.getItem(CHAVE_PEND)).length === 0);
  }

  console.log('\n[2] Cancelar e excluir');
  {
    const remoto = [
      { id: 7, data: '2026-10-20', horaEntrada: '08:00', horaSaida: '10:00', status: 'aprovada', item: 'Sala A01', criadoEm: '2026-10-01T09:00:00' },
      { id: 8, data: '2026-10-22', horaEntrada: '09:00', horaSaida: '11:00', status: 'aguardando', item: 'Sala A02', criadoEm: '2026-10-02T09:00:00' },
    ];
    const ctx = criarContexto({ reservasRemotas: remoto, falhaApi: false });
    const app = carregarReservasJs(ctx);

    await app.sincronizacao;

    const cancelado = app.cancelReserva(8);

    check('cancelar retorna true', cancelado === true);
    check('status virou cancelada', app.getReservas().find((r) => r.id === 8).status === 'cancelada');
    check('cancelar de novo é ignorado', app.cancelReserva(8) === false);
    check('cancelada não tem botão de cancelar', app.statusInfo('cancelada').label === 'Cancelada');

    check('excluir remove', app.deleteReserva(7) === true && app.getReservas().length === 1);
    check('notificações limpas', app.clearNotificacoes() === true && app.hasNotificacoes() === false);
  }

  console.log('\n[3] API fora do ar (fallback localStorage)');
  {
    const ctx = criarContexto({ reservasRemotas: [], falhaApi: true });
    const app = carregarReservasJs(ctx);

    const ok = await app.sincronizacao;

    check('sincronizar falha sem quebrar', ok === false);
    check('nenhum POST quando a API está fora', ctx.__chamadas.every((c) => c.metodo === 'GET'));

    ctx.__sessionStorage.setItem('salaSelecionada', 'Gabinete de Notebook - A');
    app.stageReserva(
      formulario({
        nomeProfessor: 'Carla',
        curso: 'Mecânica',
        motivo: 'Manutenção',
        data: '2026-10-25',
        horaEntrada: '10:00',
        horaSaida: '12:00',
      })
    );

    const criada = app.commitStagedReserva();

    check('reserva criada mesmo offline', criada !== null && criada.item === 'Gabinete de Notebook - A');
    check('sem categoria no recurso, padrao e Sala', criada.categoria === 'Sala', criada.categoria);
    check('cache local tem a reserva', JSON.parse(ctx.__localStorage.getItem(CHAVE_RESERVAS)).length === 1);

    await new Promise((r) => setTimeout(r, 10));

    check('reserva fica na fila de pendentes', JSON.parse(ctx.__localStorage.getItem(CHAVE_PEND)).length === 1);
    // Offline a tentativa de POST é feita e falha; o que não pode
    // acontecer é a reserva ser dada como perdida.
    check('a tentativa de envio falhou, sem perder a reserva', ctx.__chamadas.filter((c) => c.metodo === 'POST').length === 1 && app.getReservas().length === 1);
  }

  console.log('\n[4] Pendente é reenviado quando a API volta');
  {
    const ctx = criarContexto({ reservasRemotas: [], falhaApi: true });
    const app1 = carregarReservasJs(ctx);
    await app1.sincronizacao;

    ctx.__sessionStorage.setItem('salaSelecionada', 'Sala de aula - A05');
    app1.stageReserva(
      formulario({ nomeProfessor: 'Dan', curso: 'Fila', motivo: 'Teste', data: '2026-10-26', horaEntrada: '08:00', horaSaida: '09:00' })
    );
    const offline = app1.commitStagedReserva();

    await new Promise((r) => setTimeout(r, 10));

    // "Recarrega" a página: mesmo armazenamento, API no ar.
    const ctx2 = criarContexto({ reservasRemotas: [], falhaApi: false });
    ctx2.__localStorage._raw.set('reservasSenai', ctx.__localStorage.getItem(CHAVE_RESERVAS));
    ctx2.__localStorage._raw.set(CHAVE_PEND, ctx.__localStorage.getItem(CHAVE_PEND));
    const app2 = carregarReservasJs(ctx2);

    await app2.sincronizacao;
    await new Promise((r) => setTimeout(r, 10));

    const posts = ctx2.__chamadas.filter((c) => c.metodo === 'POST');
    check('pendente foi reenviado', posts.length === 1, JSON.stringify(ctx2.__chamadas.map((c) => c.metodo + ' ' + c.url)));
    check('fila de pendentes limpa', ctx2.__localStorage.getItem(CHAVE_PEND) === '[]');
    check('lista tem a reserva com id do banco', app2.getReservas().some((r) => r.id === 999 && r.item === offline.item));
  }

  console.log('\n[5] Calendário e formatação');
  {
    const ctx = criarContexto({ reservasRemotas: [], falhaApi: true });
    const app = carregarReservasJs(ctx);

    const matriz = app.construirMatrizMes(2026, 9); // outubro/2026
    check('matriz com 42 células', matriz.length === 42, String(matriz.length));
    check('primeira célula é um domingo', new Date(matriz[0].iso + 'T00:00').getDay() === 0, matriz[0].iso);
    check('1º de outubro de 2026 é quinta (célula com mesAtual)', matriz.some((c) => c.iso === '2026-10-01' && c.mesAtual && c.dia === 1));
    check('dias do mês anterior vêm muted', matriz[0].mesAtual === false);
    check('31 células do próprio mês', matriz.filter((c) => c.mesAtual).length === 31, String(matriz.filter((c) => c.mesAtual).length));
    check('última célula fecha no sábado', new Date(matriz[41].iso + 'T00:00').getDay() === 6, matriz[41].iso);

    check('formatDateBR', app.formatDateBR('2026-10-05') === '05/10/2026');
    check('formatDateBR vazio', app.formatDateBR('') === '');
    check('formatHorario completo', app.formatHorario('08:00', '10:00') === '08:00 às 10:00');
    check('formatHorario só entrada', app.formatHorario('08:00', '') === 'a partir de 08:00');
    check('formatHorario vazio', app.formatHorario('', '') === '');
    check('mesLabel', app.mesLabel(2026, 9) === 'Outubro 2026');
    check('MESES tem 12 meses e começa em Janeiro', app.MESES.length === 12 && app.MESES[0] === 'Janeiro');

    const hoje = app.todayISO();
    check('todayISO no formato ISO', /^\d{4}-\d{2}-\d{2}$/.test(hoje), hoje);
    check(
      'todayISO bate com a data local',
      hoje === app.toISODate(new Date()),
      `${hoje} vs ${app.toISODate(new Date())}`
    );

    const info = app.statusInfo('aguardando');
    check('badge de aguardando é amarela', info.label === 'Aguardando' && info.badgeClass === 'badge-yellow');
    check('status desconhecido não quebra', app.statusInfo('xyz').badgeClass === 'badge-yellow');
  }

  console.log('\n[6] Rascunho incompleto e listeners');
  {
    const ctx = criarContexto({ reservasRemotas: [], falhaApi: true });
    const app = carregarReservasJs(ctx);
    await app.sincronizacao;

    // Sem sala escolhida (sessionStorage vazio)
    check('sem sala não há rascunho', app.stageReserva(formulario({ nomeProfessor: 'E', data: '2026-10-01', horaEntrada: '08:00', horaSaida: '09:00' })) === null);

    // Com sala, mas sem horário
    ctx.__sessionStorage.setItem('salaSelecionada', 'Sala de aula - A01');
    check(
      'sem horário não há rascunho',
      app.stageReserva(formulario({ nomeProfessor: 'E', data: '2026-10-01', horaEntrada: '', horaSaida: '' })) === null
    );
    check('commit sem rascunho não inventa reserva', app.commitStagedReserva() === null);

    let avisos = 0;
    app.subscribe(() => avisos++);

    ctx.__sessionStorage.setItem('salaSelecionada', 'Sala de aula - A02');
    app.stageReserva(formulario({ nomeProfessor: 'F', curso: 'G', motivo: 'H', data: '2026-10-02', horaEntrada: '08:00', horaSaida: '09:00' }));
    app.commitStagedReserva();

    check('subscribe foi avisado', avisos > 0, String(avisos));
    check('getNotificacoes devolve a cópia', app.getNotificacoes().length === 1);
  }

  console.log('\n[7] Sala escolhida nos dois formatos');
  {
    // O salas.js grava objeto; a tela de gabinetes grava o nome.
    const ctx = criarContexto({ reservasRemotas: [], falhaApi: true });
    const app = carregarReservasJs(ctx);
    await app.sincronizacao;

    ctx.__sessionStorage.setItem(
      'salaSelecionada',
      JSON.stringify({
        id: 7,
        nome: 'C16',
        categoria: 'Laboratório',
        contexto: { descricao: 'Laboratório de informática', quantidade_alunos: 32 }
      })
    );

    const comObjeto = app.stageReserva(
      formulario({
        nomeProfessor: 'Gabi',
        curso: 'Info',
        motivo: 'Aula',
        data: '2026-10-27',
        horaEntrada: '08:00',
        horaSaida: '10:00'
      })
    );

    check('formato objeto: nome lido', comObjeto.item === 'C16', JSON.stringify(comObjeto));
    check('formato objeto: id lido', comObjeto.salaId === 7, String(comObjeto.salaId));
    check('formato objeto: categoria do servidor', comObjeto.categoria === 'Laboratório', comObjeto.categoria);

    const criada = app.commitStagedReserva();
    check('reserva guarda o salaId', criada.salaId === 7, String(criada.salaId));

    await new Promise((r) => setTimeout(r, 10));

    const post = ctx.__chamadas.find((c) => c.metodo === 'POST');
    check('salaId vai no corpo do POST', post && post.corpo.indexOf('"salaId":7') !== -1, post && post.corpo);

    // Formato texto: o nome vem, o id não.
    const ctx2 = criarContexto({ reservasRemotas: [], falhaApi: true });
    const app2 = carregarReservasJs(ctx2);
    await app2.sincronizacao;

    ctx2.__sessionStorage.setItem('salaSelecionada', 'Gabinete de Notebook - A');
    const comTexto = app2.stageReserva(
      formulario({ nomeProfessor: 'H', curso: 'I', motivo: 'J', data: '2026-10-28', horaEntrada: '09:00', horaSaida: '10:00' })
    );

    check('formato texto: nome lido', comTexto.item === 'Gabinete de Notebook - A', comTexto.item);
    check('formato texto: id nulo', comTexto.salaId === null, String(comObjeto.salaId));
    check('formato texto: padrao Sala', comTexto.categoria === 'Sala', comTexto.categoria);

    // Texto que não é JSON nem nome: não quebra.
    const ctx3 = criarContexto({ reservasRemotas: [], falhaApi: true });
    const app3 = carregarReservasJs(ctx3);
    ctx3.__sessionStorage.setItem('salaSelecionada', '{quebrado');
    const quebrado = app3.stageReserva(
      formulario({ nomeProfessor: 'I', curso: 'J', motivo: 'K', data: '2026-10-29', horaEntrada: '09:00', horaSaida: '10:00' })
    );
    check('JSON inválido não quebra', quebrado === null, JSON.stringify(quebrado));
  }

  console.log('\n[8] Vocabulário de status');
  {
    const ctx = criarContexto({ reservasRemotas: [], falhaApi: true });
    const app = carregarReservasJs(ctx);

    check('aguardando', app.statusInfo('aguardando').label === 'Aguardando');
    check('aprovada', app.statusInfo('aprovada').label === 'Aprovada');
    check('negada é "Recusada"', app.statusInfo('negada').label === 'Recusada', app.statusInfo('negada').label);
    check('cancelada', app.statusInfo('cancelada').label === 'Cancelada');

    const info = app.statusInfo('negada');
    check('negada usa badge vermelha', info.badgeClass === 'badge-red', info.badgeClass);
  }

  console.log('\n[9] Global publicado');
  {
    // O "const" do topo de um script nao vira propriedade de "window".
    // O notificacoes-push.js confere window.ReservasApp antes de usar o
    // modulo; sem a atribuicao explicita, a notificacao ficaria
    // desligada sem erro nenhum.
    const ctx = criarContexto({ reservasRemotas: [], falhaApi: true });
    vm.runInContext(fs.readFileSync(__dirname + '/../static/js/reservas.js', 'utf8'), ctx, { filename: 'reservas.js' });

    check('window.ReservasApp existe', typeof ctx.window.ReservasApp === 'object',
      String(typeof ctx.window.ReservasApp));
    check('window.ReservasApp tem os membros usados pelas telas',
      typeof ctx.window.ReservasApp.getReservas === 'function' && typeof ctx.window.ReservasApp.subscribe === 'function');
  }

  console.log(`\n${passou} passaram, ${falhou} falharam\n`);
  process.exit(falhou === 0 ? 0 : 1);
}

main();