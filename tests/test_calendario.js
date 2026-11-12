// Teste do calendário (static/js/pages/calendarioprof.js) fora do
// navegador. O bug que derrubava a tela era chamar
// ReservasApp.toISODate(ano, mes, dia), mas toISODate() espera um
// objeto Date. O link da tela inicial chega com ?ano=&mes=&dia=,
// então a página quebrava antes de desenhar a grade.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passaram = 0;
let falharam = 0;

function check(nome, condicao, detalhe) {
  if (condicao) {
    passaram++;
    console.log('  ok   ' + nome);
  } else {
    falharam++;
    console.log('  FALHA ' + nome + (detalhe ? ' -> ' + detalhe : ''));
  }
}

function toISODate(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function criarElemento(id) {
  return {
    id,
    textContent: '',
    innerHTML: '',
    dataset: {},
    style: {},
    _handlers: {},
    addEventListener(tipo, fn) {
      this._handlers[tipo] = fn;
    },
    querySelectorAll() {
      return [];
    },
    classList: {
      add() {},
      remove() {},
      contains() {
        return false;
      },
    },
    appendChild() {},
  };
}

function criarContexto(search) {
  const elementos = new Map();

  const document = {
    readyState: 'complete',
    getElementById(id) {
      if (!elementos.has(id)) {
        elementos.set(id, criarElemento(id));
      }
      return elementos.get(id);
    },
    addEventListener() {},
  };

  const localizacao = new URL(
    'http://localhost/calendario_prof' + search
  );

  const window = {
    location: localizacao,
    history: { replaceState() {} },
  };

  const ReservasApp = {
    MESES: [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ],
    todayISO() {
      return '2026-11-12';
    },
    toISODate,
    mesLabel(ano, mes) {
      return `${ReservasApp.MESES[mes] || ''} ${ano}`;
    },
    construirMatrizMes(ano, mes) {
      const primeiroDia = new Date(ano, mes, 1);
      const inicio = new Date(
        primeiroDia.getFullYear(),
        primeiroDia.getMonth(),
        1 - primeiroDia.getDay()
      );

      return Array.from({ length: 42 }, (_, i) => {
        const dia = new Date(
          inicio.getFullYear(),
          inicio.getMonth(),
          inicio.getDate() + i
        );

        return {
          iso: toISODate(dia),
          dia: dia.getDate(),
          mesAtual: dia.getMonth() === mes,
        };
      });
    },
    getReservasPorData() {
      return [];
    },
    statusInfo() {
      return { label: 'Aguardando', badgeClass: 'badge-yellow' };
    },
    escapar(texto) {
      return String(texto ?? '');
    },
    subscribe() {},
  };

  const contexto = vm.createContext({
    window,
    document,
    URL,
    URLSearchParams,
    Number,
    Math,
    Date,
    parseInt,
    console,
    ReservasApp,
  });

  return { contexto, document, elementos };
}

function carregarCalendario(search) {
  const { contexto, document } = criarContexto(search);
  const arquivo = path.join(
    __dirname,
    '..',
    'static',
    'js',
    'pages',
    'calendarioprof.js'
  );

  vm.runInContext(fs.readFileSync(arquivo, 'utf8'), contexto, {
    filename: 'calendarioprof.js',
  });

  return { document };
}

console.log('[1] Abre no mês atual sem parâmetros');
{
  const { document } = carregarCalendario('');
  check(
    'rótulo do mês preenchido',
    document.getElementById('calMonthLabel').textContent === 'Novembro 2026',
    document.getElementById('calMonthLabel').textContent
  );
  check(
    'grade tem 42 dias',
    (document.getElementById('calendarGrid').innerHTML.match(/calendar-day/g) || []).length === 42
  );
}

console.log('[2] Abre pelo link da tela inicial (?ano=&mes=&dia=)');
{
  const { document } = carregarCalendario('?ano=2026&mes=10&dia=12');
  const grid = document.getElementById('calendarGrid').innerHTML;

  check(
    'rótulo do mês preenchido',
    document.getElementById('calMonthLabel').textContent === 'Novembro 2026',
    document.getElementById('calMonthLabel').textContent
  );
  check('não quebra ao ler o dia da URL', grid.includes('data-iso="2026-11-12"'));
  check(
    'dia da URL fica selecionado',
    /calendar-day[^"]*selected[^"]*"\s+data-iso="2026-11-12"/.test(grid)
  );
}

console.log('[3] Dia inválido é limitado ao último dia do mês');
{
  const { document } = carregarCalendario('?ano=2026&mes=1&dia=31');
  const grid = document.getElementById('calendarGrid').innerHTML;

  check(
    'fevereiro não vira março',
    document.getElementById('calMonthLabel').textContent === 'Fevereiro 2026',
    document.getElementById('calMonthLabel').textContent
  );
  check('dia 31 cai em 28/02/2026', grid.includes('data-iso="2026-02-28"'));
  check(
    '28/02/2026 fica selecionado',
    /calendar-day[^"]*selected[^"]*"\s+data-iso="2026-02-28"/.test(grid)
  );
  check(
    '03/03/2026 não fica selecionado',
    !/calendar-day[^"]*selected[^"]*"\s+data-iso="2026-03-03"/.test(grid)
  );
}

console.log('[4] Navegação entre meses');
{
  const { document } = carregarCalendario('?ano=2026&mes=10&dia=12');
  const prev = document.getElementById('calPrev');

  prev._handlers.click();

  check(
    'mês anterior',
    document.getElementById('calMonthLabel').textContent === 'Outubro 2026',
    document.getElementById('calMonthLabel').textContent
  );

  const next = document.getElementById('calNext');

  next._handlers.click();

  check(
    'próximo mês',
    document.getElementById('calMonthLabel').textContent === 'Novembro 2026',
    document.getElementById('calMonthLabel').textContent
  );
}

console.log('');
console.log(`${passaram} passaram, ${falharam} falharam`);

process.exit(falharam === 0 ? 0 : 1);
