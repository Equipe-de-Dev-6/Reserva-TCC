/* ============================================================
 * landing.js — comportamentos da página pública
 *
 *  1. tema claro/escuro (gravado em localStorage);
 *  2. menu do celular, com foco e fechamento previsíveis;
 *  3. sombra do cabeçalho ao rolar;
 *  4. datas relativas nos cards de exemplo;
 *  5. calendário reduzido do mockup do hero;
 *  6. calendário de exemplo da seção "Calendário".
 *
 * A landing não carrega app.js nem os módulos do sistema: é uma
 * página pública, sem sessão. Toda a interação é feita só com DOM,
 * sem bibliotecas. Os dados do calendário são fictícios e estão
 * identificados como tal no HTML.
 * ============================================================ */

(function () {
  'use strict';

  var CHAVE_TEMA = 'reserva-tema';
  var LIMITE_MOBILE = 1024;

  var MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  var DIAS_SEMANA = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];

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
    // Meio-dia evita que mudanças de fuso empurrem a data para o
    // dia anterior ou seguinte.
    return new Date(ano, mes, dia, 12, 0, 0);
  }

  function formatarDataCurta(data) {
    var texto = data.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });

    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function formatarDataLonga(ano, mes, dia) {
    // Mês minúsculo em texto corrido; MESES mantém a inicial
    // maiúscula apenas para os títulos "Novembro 2026".
    return dia + ' de ' + MESES[mes].toLowerCase() + ' de ' + ano;
  }

  function diasNoMes(ano, mes) {
    return new Date(ano, mes + 1, 0).getDate();
  }

  /**
   * Matriz começando no domingo. O número de semanas é calculado:
   * fevereiro que começa no domingo usa 4 semanas, outros meses
   * usam 5 ou 6. A grade fixa de 42 células criava linhas vazias
   * e atrapalhava a navegação por teclado no fim do mês.
   */
  function construirMatriz(ano, mes) {
    var primeiro = dataLocal(ano, mes, 1);
    var inicio = dataLocal(ano, mes, 1 - primeiro.getDay());
    var total = Math.ceil((primeiro.getDay() + diasNoMes(ano, mes)) / 7) * 7;
    var celulas = [];

    for (var i = 0; i < total; i += 1) {
      var data = dataLocal(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);

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
      /* navegador sem localStorage: o tema vale só nesta visita */
    }
  }

  function aplicarTema(tema, persistir) {
    var escuro = tema === 'dark';
    var acao = escuro ? 'Ativar modo claro' : 'Ativar modo escuro';

    document.documentElement.setAttribute('data-theme', escuro ? 'dark' : 'light');

    if (botaoTema) {
      // O nome acessível permanece "Alternar tema" (definido no
      // HTML). Só o title e o estado pressionado mudam: trocar o
      // aria-label a cada clique deixa o botão imprevisível para
      // quem usa leitor de tela.
      botaoTema.setAttribute('aria-pressed', escuro ? 'true' : 'false');
      botaoTema.setAttribute('title', acao);
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

  // Sem escolha explícita, o tema acompanha o sistema enquanto a
  // página estiver aberta.
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
    if (!menuMovel || !botaoMenu || !menuAberto()) {
      return;
    }

    menuMovel.setAttribute('hidden', '');
    botaoMenu.setAttribute('aria-expanded', 'false');
    botaoMenu.setAttribute('aria-label', 'Abrir menu');
  }

  function abrirMenu() {
    if (!menuMovel || !botaoMenu || menuAberto()) {
      return;
    }

    menuMovel.removeAttribute('hidden');
    botaoMenu.setAttribute('aria-expanded', 'true');
    botaoMenu.setAttribute('aria-label', 'Fechar menu');
  }

  // Depois de seguir uma âncora do menu, o foco precisa ir para o
  // destino. Sem isso, o teclado continuaria no botão de menu já
  // fechado. preventScroll evita que o foco interrompa a rolagem
  // suave disparada pelo href.
  function focarDestino(link) {
    var href = link.getAttribute('href');

    if (!href || href.charAt(0) !== '#') {
      return;
    }

    var destino = document.querySelector(href);

    if (!destino) {
      return;
    }

    if (!destino.hasAttribute('tabindex')) {
      destino.setAttribute('tabindex', '-1');
    }

    try {
      destino.focus({ preventScroll: true });
    } catch (erro) {
      destino.focus();
    }
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
      var link = evento.target.closest('a');

      if (!link) {
        return;
      }

      focarDestino(link);
      fecharMenu();
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape' && menuAberto()) {
        fecharMenu();
        botaoMenu.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > LIMITE_MOBILE) {
        fecharMenu();
      }
    });
  }

  /* ------------------------------------------------------------
   * CABEÇALHO AO ROLAR
   * ------------------------------------------------------------ */

  var cabecalho = document.querySelector('.site-header');

  function atualizarCabecalho() {
    if (cabecalho) {
      if (window.scrollY > 8) {
        cabecalho.classList.add('scrolled');
      } else {
        cabecalho.classList.remove('scrolled');
      }
    }

    // Rolar com o menu aberto esconde a navegação, mas mantém o
    // usuário no ponto da página que ele estava lendo.
    if (menuAberto() && window.scrollY > 8) {
      fecharMenu();
    }
  }

  atualizarCabecalho();
  window.addEventListener('scroll', atualizarCabecalho, { passive: true });

  /* ------------------------------------------------------------
   * DATAS DOS CARTÕES DE EXEMPLO
   * ------------------------------------------------------------ */

  var hoje = new Date();

  function preencherDatasDeExemplo() {
    var alvos = document.querySelectorAll('[data-data-offset]');

    for (var i = 0; i < alvos.length; i += 1) {
      var deslocamento = parseInt(alvos[i].getAttribute('data-data-offset'), 10);

      if (isNaN(deslocamento)) {
        deslocamento = 0;
      }

      var data = dataLocal(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + deslocamento);
      alvos[i].textContent = formatarDataCurta(data);
    }
  }

  preencherDatasDeExemplo();

  /* ------------------------------------------------------------
   * RESERVAS DE EXEMPLO
   *
   * O calendário real do sistema mostra horário, recurso, motivo
   * e situação — sem nome do professor. Os exemplos abaixo seguem
   * exatamente esses campos e mudam de dia conforme o mês.
   * ------------------------------------------------------------ */

  var MODELOS = [
    { dia: 4, hora: '08:00 às 10:00', recurso: 'Laboratório 2', motivo: 'Aula prática de Automação', status: 'aprovada' },
    { dia: 7, hora: '10:00 às 12:00', recurso: 'Sala C11', motivo: 'Aula de Matemática Aplicada', status: 'aprovada' },
    { dia: 11, hora: '13:30 às 15:30', recurso: 'Gabinete de Notebook A', motivo: 'Projeto integrador', status: 'aguardando' },
    { dia: 14, hora: '16:00 às 17:30', recurso: 'Sala C13', motivo: 'Reunião de equipe', status: 'aguardando' },
    { dia: 18, hora: '08:00 às 09:30', recurso: 'Laboratório 1', motivo: 'Aula de Redes', status: 'negada' },
    { dia: 21, hora: '19:00 às 21:00', recurso: 'Sala C12', motivo: 'Aula noturna de Programação', status: 'aprovada' },
    { dia: 25, hora: '14:00 às 16:00', recurso: 'Gabinete de Notebook B', motivo: 'Oficina de manutenção', status: 'cancelada' },
    { dia: 28, hora: '10:00 às 11:30', recurso: 'Laboratório 3', motivo: 'Avaliação prática', status: 'aguardando' }
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
        motivo: modelo.motivo,
        status: modelo.status
      });
    }

    cacheReservas[chave] = porDia;
    return porDia;
  }

  /* ------------------------------------------------------------
   * CALENDÁRIO REDUZIDO DO HERO
   * ------------------------------------------------------------ */

  function montarCalendarioDoMockup() {
    var grade = document.getElementById('mockCalGrid');
    var rotulo = document.getElementById('mockCalLabel');

    if (!grade || !rotulo) {
      return;
    }

    var ano = hoje.getFullYear();
    var mes = hoje.getMonth();
    var porDia = reservasDoMes(ano, mes);
    var celulas = construirMatriz(ano, mes);
    var fragmento = document.createDocumentFragment();
    var isoHoje = isoDe(ano, mes, hoje.getDate());
    var i;

    rotulo.textContent = MESES[mes] + ' ' + ano;

    for (i = 0; i < DIAS_SEMANA.length; i += 1) {
      var semana = document.createElement('span');
      semana.className = 'cal-week';
      semana.textContent = DIAS_SEMANA[i].charAt(0);
      fragmento.appendChild(semana);
    }

    for (i = 0; i < celulas.length; i += 1) {
      var celula = celulas[i];
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

    grade.textContent = '';
    grade.appendChild(fragmento);
  }

  montarCalendarioDoMockup();

  /* ------------------------------------------------------------
   * CALENDÁRIO DE EXEMPLO
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
    var isoHoje = isoDe(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    var porDiaInicial = reservasDoMes(demoAno, demoMes);

    // Começa em hoje quando há reservas; senão, no primeiro dia
    // com reservas; senão, no dia 1.
    var demoSelecionado = isoHoje;

    if (!porDiaInicial[demoSelecionado]) {
      var diasComReserva = Object.keys(porDiaInicial).sort();
      demoSelecionado = diasComReserva.length ? diasComReserva[0] : isoDe(demoAno, demoMes, 1);
    }

    function criarBadge(status) {
      var info = STATUS[status] || STATUS.aguardando;
      var badge = document.createElement('span');

      badge.className = 'badge ' + info.classe;
      badge.textContent = info.rotulo;

      return badge;
    }

    // Rótulo do botão: dia da semana + data + quantidade. Assim,
    // quem navega por teclado sabe o que esperar antes de ativar.
    function rotuloAcessivel(ano, mes, dia, quantidade) {
      var texto = DIAS_SEMANA[dataLocal(ano, mes, dia).getDay()] + ', ' +
                  formatarDataLonga(ano, mes, dia);

      if (quantidade === 0) {
        return texto + ', sem reservas';
      }

      return texto + ', ' + quantidade + (quantidade === 1 ? ' reserva' : ' reservas');
    }

    function renderizarPainel() {
      if (!tituloDia || !subtituloDia || !listaDia) {
        return;
      }

      var partes = demoSelecionado.split('-');
      var ano = parseInt(partes[0], 10);
      var mes = parseInt(partes[1], 10) - 1;
      var dia = parseInt(partes[2], 10);
      var reservas = reservasDoMes(ano, mes)[demoSelecionado] || [];

      tituloDia.textContent = 'Reservas - Dia ' + doisDigitos(dia);

      // Única região aria-live da landing: anuncia data e
      // quantidade sem repetir o conteúdo de cada cartão.
      subtituloDia.textContent = formatarDataLonga(ano, mes, dia) + ' · ' +
        (reservas.length ? reservas.length + (reservas.length === 1 ? ' reserva' : ' reservas') : 'nenhuma reserva');

      while (listaDia.firstChild) {
        listaDia.removeChild(listaDia.firstChild);
      }

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
        detalhe.textContent = 'Motivo: ' + reserva.motivo;

        cartao.appendChild(cabecalho);
        cartao.appendChild(titulo);
        cartao.appendChild(detalhe);
        listaDia.appendChild(cartao);
      }
    }

    // Roving tabindex: apenas o dia selecionado entra na ordem de
    // Tab. As setas movem o foco entre os dias, em vez de exigir
    // uma parada por célula.
    function atualizarSelecaoNoGrid() {
      var botoes = gradeDemo.querySelectorAll('.calendar-day');

      for (var i = 0; i < botoes.length; i += 1) {
        var botao = botoes[i];
        var selecionado = botao.dataset.iso === demoSelecionado;

        botao.tabIndex = selecionado ? 0 : -1;

        if (selecionado) {
          botao.className += ' selected';
          botao.setAttribute('aria-current', 'date');
        } else {
          botao.className = botao.className.replace(/\s+selected/g, '');
          botao.removeAttribute('aria-current');
        }
      }
    }

    function renderizarCalendarioDemo(isoParaFocar) {
      rotuloDemo.textContent = MESES[demoMes] + ' ' + demoAno;

      var porDia = reservasDoMes(demoAno, demoMes);
      var celulas = construirMatriz(demoAno, demoMes);
      var fragmento = document.createDocumentFragment();
      var i;

      for (i = 0; i < celulas.length; i += 1) {
        var celula = celulas[i];
        var botao = document.createElement('button');
        var reservas = porDia[celula.iso] || [];
        var numero = document.createElement('span');

        botao.type = 'button';
        botao.className = 'calendar-day';
        botao.dataset.iso = celula.iso;
        botao.setAttribute('aria-label', rotuloAcessivel(celula.ano, celula.mes, celula.dia, reservas.length));

        numero.textContent = celula.dia;
        botao.appendChild(numero);

        if (!celula.mesAtual) {
          botao.className += ' muted';
        }

        if (celula.iso === isoHoje) {
          botao.className += ' today';
        }

        if (reservas.length) {
          botao.className += ' has';

          var contador = document.createElement('span');
          contador.className = 'calendar-day-count';
          contador.textContent = reservas.length;
          botao.appendChild(contador);
        }

        fragmento.appendChild(botao);
      }

      while (gradeDemo.firstChild) {
        gradeDemo.removeChild(gradeDemo.firstChild);
      }

      gradeDemo.appendChild(fragmento);
      atualizarSelecaoNoGrid();
      renderizarPainel();

      if (isoParaFocar) {
        var alvo = gradeDemo.querySelector('.calendar-day[data-iso="' + isoParaFocar + '"]');

        if (alvo) {
          alvo.focus();
        }
      }
    }

    function selecionarDia(iso, focar) {
      var partes = iso.split('-');
      var ano = parseInt(partes[0], 10);
      var mes = parseInt(partes[1], 10) - 1;
      var mudouDeMes = ano !== demoAno || mes !== demoMes;

      demoAno = ano;
      demoMes = mes;
      demoSelecionado = iso;

      if (mudouDeMes) {
        renderizarCalendarioDemo(focar ? iso : null);
        return;
      }

      atualizarSelecaoNoGrid();
      renderizarPainel();

      if (focar) {
        var alvo = gradeDemo.querySelector('.calendar-day[data-iso="' + iso + '"]');

        if (alvo) {
          alvo.focus();
        }
      }
    }

    function mudarMes(deslocamento, focar) {
      var dia = parseInt(demoSelecionado.split('-')[2], 10);

      demoMes += deslocamento;

      while (demoMes < 0) {
        demoMes += 12;
        demoAno -= 1;
      }

      while (demoMes > 11) {
        demoMes -= 12;
        demoAno += 1;
      }

      demoSelecionado = isoDe(demoAno, demoMes, Math.min(dia, diasNoMes(demoAno, demoMes)));
      renderizarCalendarioDemo(focar ? demoSelecionado : null);
    }

    gradeDemo.addEventListener('click', function (evento) {
      var botao = evento.target.closest('.calendar-day');

      if (botao) {
        selecionarDia(botao.dataset.iso, false);
      }
    });

    gradeDemo.addEventListener('keydown', function (evento) {
      var deslocamentos = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7
      };
      var botoes = gradeDemo.querySelectorAll('.calendar-day');
      var indice = Array.prototype.indexOf.call(botoes, document.activeElement);
      var alvo;
      var passo;

      if (indice < 0) {
        return;
      }

      if (Object.prototype.hasOwnProperty.call(deslocamentos, evento.key)) {
        evento.preventDefault();
        passo = indice + deslocamentos[evento.key];
        alvo = botoes[passo];

        if (alvo && passo >= 0) {
          selecionarDia(alvo.dataset.iso, true);
        }
        return;
      }

      if (evento.key === 'Home' || evento.key === 'End') {
        evento.preventDefault();
        alvo = evento.key === 'Home' ? botoes[0] : botoes[botoes.length - 1];

        if (alvo) {
          selecionarDia(alvo.dataset.iso, true);
        }
        return;
      }

      if (evento.key === 'PageUp' || evento.key === 'PageDown') {
        evento.preventDefault();
        mudarMes(evento.key === 'PageUp' ? -1 : 1, true);
      }
    });

    if (botaoAnterior) {
      botaoAnterior.addEventListener('click', function () {
        mudarMes(-1, false);
      });
    }

    if (botaoProximo) {
      botaoProximo.addEventListener('click', function () {
        mudarMes(1, false);
      });
    }

    renderizarCalendarioDemo();
  }
})();
