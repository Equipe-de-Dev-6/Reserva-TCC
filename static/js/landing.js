/* ============================================================
 * landing.js
 *
 * Comportamentos da pagina publica:
 *
 *   1. tema claro/escuro (gravado em localStorage)
 *   2. menu do celular
 *   3. sombra do cabecalho ao rolar
 *   4. calendario reduzido do mockup do hero
 *   5. calendario de exemplo da secao "Calendario"
 *   6. datas futuras nos cartoes de exemplo
 *
 * A pagina nao carrega o app.js nem o reservas.js do sistema:
 * ela e publica, sem sessao e sem menu lateral. Por isso este
 * arquivo e independente e usa apenas DOM e Intl.
 * ============================================================ */

(function () {
  'use strict';

  var CHAVE_TEMA = 'reserva-tema';

  var MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  var DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  var STATUS = {
    aprovada: { rotulo: 'Aprovada', classe: 'badge-green' },
    aguardando: { rotulo: 'Aguardando', classe: 'badge-yellow' },
    negada: { rotulo: 'Recusada', classe: 'badge-red' },
    cancelada: { rotulo: 'Cancelada', classe: 'badge-red' }
  };

  /* ------------------------------------------------------------
   * DATAS
   * ------------------------------------------------------------ */

  function doisDigitos(valor) {
    return valor < 10 ? '0' + valor : String(valor);
  }

  function isoDe(ano, mes, dia) {
    return ano + '-' + doisDigitos(mes + 1) + '-' + doisDigitos(dia);
  }

  function dataLocal(ano, mes, dia) {
    // Meio-dia evita que o fuso horario empurre a data para o dia
    // anterior ou seguinte quando o horario de verao muda.
    return new Date(ano, mes, dia, 12, 0, 0);
  }

  function formatarDataCurta(data) {
    var texto = data.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });

    // "qua., 18 de nov." -> "Qua., 18 de nov."
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function formatarDataLonga(ano, mes, dia) {
    return dia + ' de ' + MESES[mes] + ' de ' + ano;
  }

  function diasNoMes(ano, mes) {
    return new Date(ano, mes + 1, 0).getDate();
  }

  /**
   * Matriz de 6 semanas comecando no domingo. Cada celula sabe a
   * que mes pertence, para o calendario poder navegar ao clicar
   * em um dia das bordas.
   */
  function construirMatriz(ano, mes) {
    var primeiro = new Date(ano, mes, 1, 12, 0, 0);
    var inicio = new Date(ano, mes, 1 - primeiro.getDay(), 12, 0, 0);
    var celulas = [];

    for (var i = 0; i < 42; i += 1) {
      var data = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i, 12, 0, 0);

      celulas.push({
        data: data,
        ano: data.getFullYear(),
        mes: data.getMonth(),
        dia: data.getDate(),
        iso: isoDe(data.getFullYear(), data.getMonth(), data.getDate()),
        mesAtual: data.getMonth() === mes && data.getFullYear() === ano
      });
    }

    return celulas;
  }

  /* ------------------------------------------------------------
   * TEMA
   * ------------------------------------------------------------ */

  var botaoTema = document.getElementById('themeToggle');
  var metaTema = document.querySelector('meta[name="theme-color"]');

  function lerTemaSalvo() {
    try {
      var valor = localStorage.getItem(CHAVE_TEMA);
      return valor === 'dark' || valor === 'light' ? valor : null;
    } catch (erro) {
      return null;
    }
  }

  function gravarTema(tema) {
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch (erro) {
      /* navegador sem localStorage: o tema vale so nesta visita */
    }
  }

  function aplicarTema(tema, persistir) {
    var escuro = tema === 'dark';

    document.documentElement.setAttribute('data-theme', escuro ? 'dark' : 'light');

    if (botaoTema) {
      botaoTema.setAttribute('aria-pressed', escuro ? 'true' : 'false');
      botaoTema.setAttribute('aria-label', escuro ? 'Ativar modo claro' : 'Ativar modo escuro');
      botaoTema.setAttribute('title', escuro ? 'Ativar modo claro' : 'Ativar modo escuro');
    }

    if (metaTema) {
      metaTema.setAttribute('content', escuro ? '#0B0F14' : '#E30613');
    }

    if (persistir) {
      gravarTema(escuro ? 'dark' : 'light');
    }
  }

  if (botaoTema) {
    var temaAtual = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    aplicarTema(temaAtual, false);

    botaoTema.addEventListener('click', function () {
      var atual = document.documentElement.getAttribute('data-theme');
      aplicarTema(atual === 'dark' ? 'light' : 'dark', true);
    });
  }

  // Se a pessoa nunca escolheu um tema, acompanha a preferencia do
  // sistema operacional enquanto a pagina estiver aberta.
  if (window.matchMedia) {
    var consultaEscuro = window.matchMedia('(prefers-color-scheme: dark)');

    var aoMudarSistema = function (evento) {
      if (lerTemaSalvo() === null) {
        aplicarTema(evento.matches ? 'dark' : 'light', false);
      }
    };

    if (consultaEscuro.addEventListener) {
      consultaEscuro.addEventListener('change', aoMudarSistema);
    } else if (consultaEscuro.addListener) {
      consultaEscuro.addListener(aoMudarSistema);
    }
  }

  /* ------------------------------------------------------------
   * MENU DO CELULAR
   * ------------------------------------------------------------ */

  var botaoMenu = document.getElementById('menuToggle');
  var menuMovel = document.getElementById('mobileMenu');

  function menuAberto() {
    return menuMovel && !menuMovel.hasAttribute('hidden');
  }

  function fecharMenu() {
    if (!menuMovel || !botaoMenu) {
      return;
    }

    menuMovel.setAttribute('hidden', '');
    botaoMenu.setAttribute('aria-expanded', 'false');
    botaoMenu.setAttribute('aria-label', 'Abrir menu');
  }

  function abrirMenu() {
    if (!menuMovel || !botaoMenu) {
      return;
    }

    menuMovel.removeAttribute('hidden');
    botaoMenu.setAttribute('aria-expanded', 'true');
    botaoMenu.setAttribute('aria-label', 'Fechar menu');
  }

  if (botaoMenu && menuMovel) {
    botaoMenu.addEventListener('click', function () {
      if (menuAberto()) {
        fecharMenu();
      } else {
        abrirMenu();
      }
    });

    menuMovel.addEventListener('click', function (evento) {
      if (evento.target.closest('a')) {
        fecharMenu();
      }
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape' && menuAberto()) {
        fecharMenu();
        botaoMenu.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 920) {
        fecharMenu();
      }
    });
  }

  /* ------------------------------------------------------------
   * CABECALHO AO ROLAR
   * ------------------------------------------------------------ */

  var cabecalho = document.querySelector('.site-header');

  function atualizarCabecalho() {
    if (!cabecalho) {
      return;
    }

    if (window.scrollY > 8) {
      cabecalho.classList.add('scrolled');
    } else {
      cabecalho.classList.remove('scrolled');
    }
  }

  if (cabecalho) {
    atualizarCabecalho();
    window.addEventListener('scroll', atualizarCabecalho, { passive: true });
  }

  /* ------------------------------------------------------------
   * DATAS DOS CARTOES DE EXEMPLO
   * ------------------------------------------------------------ */

  var hoje = new Date();

  function preencherDatasDeExemplo() {
    var alvos = document.querySelectorAll('[data-data-offset]');

    for (var i = 0; i < alvos.length; i += 1) {
      var deslocamento = parseInt(alvos[i].getAttribute('data-data-offset'), 10);

      if (isNaN(deslocamento)) {
        deslocamento = 0;
      }

      var data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + deslocamento, 12, 0, 0);

      alvos[i].textContent = formatarDataCurta(data);
    }
  }

  preencherDatasDeExemplo();

  /* ------------------------------------------------------------
   * RESERVAS DE EXEMPLO
   *
   * Dados ficticios, so para a previa do calendario. O proprio
   * texto da secao avisa que as reservas reais aparecem depois
   * do login. Os dias mudam um pouco de um mes para o outro para
   * a navegacao nao parecer congelada.
   * ------------------------------------------------------------ */

  var MODELOS = [
    {
      dia: 4,
      hora: '08:00 às 10:00',
      recurso: 'Laboratório 2',
      professor: 'Prof. João',
      motivo: 'Aula prática de Automação',
      status: 'aprovada'
    },
    {
      dia: 7,
      hora: '10:00 às 12:00',
      recurso: 'Sala C11',
      professor: 'Prof. Gabriel',
      motivo: 'Aula de Matemática Aplicada',
      status: 'aprovada'
    },
    {
      dia: 11,
      hora: '13:30 às 15:30',
      recurso: 'Gabinete de Notebook A',
      professor: 'Prof. Guilherme',
      motivo: 'Projeto integrador',
      status: 'aguardando'
    },
    {
      dia: 14,
      hora: '16:00 às 17:30',
      recurso: 'Sala C13',
      professor: 'Prof. Gabriel',
      motivo: 'Reunião de equipe',
      status: 'aguardando'
    },
    {
      dia: 18,
      hora: '08:00 às 09:30',
      recurso: 'Laboratório 1',
      professor: 'Prof. João',
      motivo: 'Aula de Redes',
      status: 'negada'
    },
    {
      dia: 21,
      hora: '19:00 às 21:00',
      recurso: 'Sala C12',
      professor: 'Prof. Guilherme',
      motivo: 'Aula noturna de Programação',
      status: 'aprovada'
    },
    {
      dia: 25,
      hora: '14:00 às 16:00',
      recurso: 'Gabinete de Notebook B',
      professor: 'Prof. Gabriel',
      motivo: 'Oficina de manutenção',
      status: 'cancelada'
    },
    {
      dia: 28,
      hora: '10:00 às 11:30',
      recurso: 'Laboratório 3',
      professor: 'Prof. João',
      motivo: 'Avaliação prática',
      status: 'aguardando'
    }
  ];

  var cacheReservas = {};

  function reservasDoMes(ano, mes) {
    var chave = ano + '-' + mes;

    if (cacheReservas[chave]) {
      return cacheReservas[chave];
    }

    var porDia = {};
    var deslocamento = mes % 3;

    for (var i = 0; i < MODELOS.length; i += 1) {
      var modelo = MODELOS[i];
      var dia = modelo.dia + deslocamento;

      if (dia > 28) {
        dia -= 3;
      }

      var iso = isoDe(ano, mes, dia);
      var lista = porDia[iso] || (porDia[iso] = []);

      lista.push({
        hora: modelo.hora,
        recurso: modelo.recurso,
        professor: modelo.professor,
        motivo: modelo.motivo,
        status: modelo.status
      });
    }

    cacheReservas[chave] = porDia;
    return porDia;
  }

  /* ------------------------------------------------------------
   * CALENDARIO REDUZIDO DO HERO
   * ------------------------------------------------------------ */

  function montarCalendarioDoMockup() {
    var grade = document.getElementById('mockCalGrid');
    var rotulo = document.getElementById('mockCalLabel');

    if (!grade || !rotulo) {
      return;
    }

    var ano = hoje.getFullYear();
    var mes = hoje.getMonth();

    rotulo.textContent = MESES[mes] + ' ' + ano;

    var porDia = reservasDoMes(ano, mes);
    var celulas = construirMatriz(ano, mes);
    var fragmento = document.createDocumentFragment();

    for (var i = 0; i < DIAS_SEMANA.length; i += 1) {
      var semana = document.createElement('span');
      semana.className = 'cal-week';
      semana.textContent = DIAS_SEMANA[i].charAt(0);
      fragmento.appendChild(semana);
    }

    var isoHoje = isoDe(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    for (var j = 0; j < celulas.length; j += 1) {
      var celula = celulas[j];
      var dia = document.createElement('span');

      dia.className = 'cal-day';
      dia.textContent = celula.dia;

      if (!celula.mesAtual) {
        dia.className += ' muted';
      }

      if (porDia[celula.iso]) {
        dia.className += ' has';
      }

      if (celula.iso === isoHoje) {
        dia.className += ' today';
      }

      fragmento.appendChild(dia);
    }

    grade.innerHTML = '';
    grade.appendChild(fragmento);
  }

  montarCalendarioDoMockup();

  /* ------------------------------------------------------------
   * CALENDARIO DE EXEMPLO
   * ------------------------------------------------------------ */

  var gradeDemo = document.getElementById('demoCalGrid');
  var rotuloDemo = document.getElementById('demoMonthLabel');
  var tituloDia = document.getElementById('demoDayTitle');
  var subtituloDia = document.getElementById('demoDaySubtitle');
  var listaDia = document.getElementById('demoDayList');
  var botaoAnterior = document.getElementById('demoPrev');
  var botaoProximo = document.getElementById('demoNext');

  if (gradeDemo && rotuloDemo) {
    var demoAno = hoje.getFullYear();
    var demoMes = hoje.getMonth();

    var porDiaAtual = reservasDoMes(demoAno, demoMes);
    var isoHoje = isoDe(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    // Comeca no dia de hoje quando ele tem reservas; senao, no
    // primeiro dia com reservas do mes; senao, no dia 1.
    var demoSelecionado = isoHoje;

    if (!porDiaAtual[demoSelecionado]) {
      var diasComReserva = Object.keys(porDiaAtual).sort();

      demoSelecionado = diasComReserva.length ? diasComReserva[0] : isoDe(demoAno, demoMes, 1);
    }

    function criarBadge(status) {
      var info = STATUS[status] || STATUS.aguardando;
      var badge = document.createElement('span');

      badge.className = 'badge ' + info.classe;
      badge.textContent = info.rotulo;

      return badge;
    }

    function renderizarPainel() {
      var partes = demoSelecionado.split('-');
      var ano = parseInt(partes[0], 10);
      var mes = parseInt(partes[1], 10) - 1;
      var dia = parseInt(partes[2], 10);

      tituloDia.textContent = 'Reservas - Dia ' + doisDigitos(dia);
      subtituloDia.textContent = formatarDataLonga(ano, mes, dia);

      var reservas = reservasDoMes(ano, mes)[demoSelecionado] || [];

      listaDia.innerHTML = '';

      if (!reservas.length) {
        var vazio = document.createElement('p');
        vazio.className = 'demo-empty';
        vazio.textContent = 'Nenhuma reserva para este dia.';
        listaDia.appendChild(vazio);
        return;
      }

      for (var i = 0; i < reservas.length; i += 1) {
        var reserva = reservas[i];

        var cartao = document.createElement('div');
        cartao.className = 'demo-res';

        var cabecalho = document.createElement('div');
        cabecalho.className = 'demo-res-head';

        var hora = document.createElement('span');
        hora.className = 'demo-res-time';
        hora.textContent = reserva.hora;

        cabecalho.appendChild(hora);
        cabecalho.appendChild(criarBadge(reserva.status));

        var titulo = document.createElement('p');
        titulo.className = 'demo-res-title';
        titulo.textContent = reserva.recurso;

        var detalhe = document.createElement('p');
        detalhe.className = 'demo-res-sub';
        detalhe.textContent = reserva.professor + ' - ' + reserva.motivo;

        cartao.appendChild(cabecalho);
        cartao.appendChild(titulo);
        cartao.appendChild(detalhe);

        listaDia.appendChild(cartao);
      }
    }

    function renderizarCalendarioDemo() {
      rotuloDemo.textContent = MESES[demoMes] + ' ' + demoAno;

      var porDia = reservasDoMes(demoAno, demoMes);
      var celulas = construirMatriz(demoAno, demoMes);
      var fragmento = document.createDocumentFragment();

      for (var i = 0; i < celulas.length; i += 1) {
        var celula = celulas[i];
        var botao = document.createElement('button');

        botao.type = 'button';
        botao.className = 'calendar-day';
        botao.setAttribute('aria-pressed', celula.iso === demoSelecionado ? 'true' : 'false');
        botao.setAttribute('aria-label', formatarDataLonga(celula.ano, celula.mes, celula.dia));
        botao.dataset.iso = celula.iso;

        if (!celula.mesAtual) {
          botao.className += ' muted';
        }

        if (celula.iso === isoHoje) {
          botao.className += ' today';
        }

        if (celula.iso === demoSelecionado) {
          botao.className += ' selected';
        }

        var numero = document.createElement('span');
        numero.textContent = celula.dia;
        botao.appendChild(numero);

        var reservas = porDia[celula.iso];

        if (reservas && reservas.length) {
          botao.className += ' has';

          var contador = document.createElement('span');
          contador.className = 'calendar-day-count';
          contador.textContent = reservas.length;
          botao.appendChild(contador);
        }

        fragmento.appendChild(botao);
      }

      gradeDemo.innerHTML = '';
      gradeDemo.appendChild(fragmento);
      renderizarPainel();
    }

    gradeDemo.addEventListener('click', function (evento) {
      var botao = evento.target.closest('.calendar-day');

      if (!botao) {
        return;
      }

      var partes = botao.dataset.iso.split('-');
      var ano = parseInt(partes[0], 10);
      var mes = parseInt(partes[1], 10) - 1;

      demoAno = ano;
      demoMes = mes;
      demoSelecionado = botao.dataset.iso;

      renderizarCalendarioDemo();
    });

    if (botaoAnterior) {
      botaoAnterior.addEventListener('click', function () {
        demoMes -= 1;

        if (demoMes < 0) {
          demoMes = 11;
          demoAno -= 1;
        }

        var dia = parseInt(demoSelecionado.split('-')[2], 10);
        var limite = diasNoMes(demoAno, demoMes);

        demoSelecionado = isoDe(demoAno, demoMes, Math.min(dia, limite));
        renderizarCalendarioDemo();
      });
    }

    if (botaoProximo) {
      botaoProximo.addEventListener('click', function () {
        demoMes += 1;

        if (demoMes > 11) {
          demoMes = 0;
          demoAno += 1;
        }

        var dia = parseInt(demoSelecionado.split('-')[2], 10);
        var limite = diasNoMes(demoAno, demoMes);

        demoSelecionado = isoDe(demoAno, demoMes, Math.min(dia, limite));
        renderizarCalendarioDemo();
      });
    }

    renderizarCalendarioDemo();
  }
})();
