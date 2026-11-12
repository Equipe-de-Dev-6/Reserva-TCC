// Busca o nome do usuário autenticado pela sessão do FastAPI.

    document.addEventListener('DOMContentLoaded', () => {

      // Verifica se os elementos necessários existem no DOM
      const requiredElements = [
        'calMonthLabel',
        'calendarGrid',
        'dayPanelTitle',
        'dayPanelSubtitle',
        'dayPanelList'
      ];
      
      const missingElements = requiredElements.filter(id =>
        !document.getElementById(id)
      );
      
      if (missingElements.length > 0) {
        console.error('Calendário: Elementos obrigatórios ausentes no DOM:', missingElements);
        return;
      }

      // Verifica se o ReservasApp está disponível (carregado via reservas.js)
      if (typeof ReservasApp === 'undefined') {
        console.error('Calendário: ReservasApp não definido. Verifique se /js/reservas.js foi carregado antes deste módulo.');
        return;
      }
      
      // ---------------------------------------------------------------
      // Calendário
      // ---------------------------------------------------------------

      const hoje = new Date();
      const hojeISO = ReservasApp.todayISO();

      const params = new URLSearchParams(window.location.search);

      let anoAtual = params.has('ano')
        ? parseInt(params.get('ano'), 10)
        : hoje.getFullYear();

      let mesAtual = params.has('mes')
        ? parseInt(params.get('mes'), 10)
        : hoje.getMonth();

      let diaSelecionadoISO = params.has('dia')
        ? ReservasApp.toISODate(
          anoAtual,
          mesAtual,
          parseInt(params.get('dia'), 10)
        )
        : hojeISO;

      function nomeCategoriaIcone(categoria) {
        const cat = (categoria || '').toLowerCase();

        if (cat.includes('laborat')) {
          return '/assets/icons/computer.png';
        }

        if (cat.includes('gabinete')) {
          return '/assets/icons/shopping-cart.png';
        }

        return '/assets/icons/classroom.png';
      }

      function renderPainelDia(iso) {
        const titulo = document.getElementById('dayPanelTitle');
        const subtitulo = document.getElementById('dayPanelSubtitle');
        const lista = document.getElementById('dayPanelList');

        const partes = iso.split('-');
        const dia = parseInt(partes[2], 10);
        const mesIndex = parseInt(partes[1], 10) - 1;
        const ano = parseInt(partes[0], 10);

        titulo.textContent =
          `Reservas - Dia ${dia < 10 ? '0' + dia : dia}`;

        subtitulo.textContent =
          `${dia} de ${ReservasApp.MESES[mesIndex]} de ${ano}`;

        const reservasDoDia = ReservasApp.getReservasPorData(iso);

        if (reservasDoDia.length === 0) {
          lista.innerHTML =
            '<p class="day-panel-empty">Nenhuma reserva para este dia.</p>';
          return;
        }

        lista.innerHTML = reservasDoDia.map((r) => {
          const info = ReservasApp.statusInfo(r.status);

          return `
            <div class="day-reserva-item">
              <p class="reserva-hora">
                ${ReservasApp.formatHorario(
            r.horaEntrada,
            r.horaSaida
          )}
              </p>

              <p class="reserva-titulo">
                ${ReservasApp.escapar(
                                  r.item || r.categoria
                                )}
              </p>

              <p class="reserva-subtitulo">
                ${r.motivo || ''}
              </p>

              <span class="reserva-status-mini ${info.badgeClass}">
                ${info.label}
              </span>
            </div>
          `;
        }).join('');
      }

      function renderCalendario() {
        document.getElementById('calMonthLabel').textContent =
          ReservasApp.mesLabel(anoAtual, mesAtual);

        const celulas = ReservasApp.construirMatrizMes(
          anoAtual,
          mesAtual
        );

        const gridEl = document.getElementById('calendarGrid');

        gridEl.innerHTML = celulas.map((c) => {
          const reservasDoDia = ReservasApp.getReservasPorData(c.iso);
          const classes = ['calendar-day'];

          if (!c.mesAtual) {
            classes.push('muted');
          }

          if (reservasDoDia.length > 0) {
            classes.push('has-reservation');
          }

          if (c.iso === hojeISO) {
            classes.push('today');
          }

          if (c.iso === diaSelecionadoISO) {
            classes.push('selected');
          }

          const badge = reservasDoDia.length > 0
            ? `
              <span class="day-reserva-count">
                ${reservasDoDia.length}
                Reserva${reservasDoDia.length > 1 ? 's' : ''}
              </span>
            `
            : '';

          return `
            <div
              class="${classes.join(' ')}"
              data-iso="${c.iso}"
            >
              <span class="day-number">
                ${c.dia}
              </span>
              ${badge}
            </div>
          `;
        }).join('');

        renderPainelDia(diaSelecionadoISO);
      }

      document
        .getElementById('calendarGrid')
        .addEventListener('click', (e) => {
          const dayEl = e.target.closest('.calendar-day');

          if (!dayEl) {
            return;
          }

          diaSelecionadoISO = dayEl.dataset.iso;

          const [anoIso, mesIso] = diaSelecionadoISO
            .split('-')
            .map(Number);

          if (
            anoIso !== anoAtual ||
            (mesIso - 1) !== mesAtual
          ) {
            anoAtual = anoIso;
            mesAtual = mesIso - 1;
          }

          renderCalendario();
          atualizarURL();
        });

      function atualizarURL() {
        // Atualiza a URL sem recarregar a página, permitindo
        // compartilhar o link e recarregar mantendo o mês selecionado.
        // O mês é armazenado 0-based (como JavaScript) para consistência
        // com a leitura inicial em parseInt(params.get('mes'), 10).
        const url = new URL(window.location);
        url.searchParams.set('ano', String(anoAtual));
        url.searchParams.set('mes', String(mesAtual)); // 0-based, consistente com a leitura
        url.searchParams.set('dia', String(diaSelecionadoISO.split('-')[2]));
        window.history.replaceState(null, '', url);
      }

      document
        .getElementById('calPrev')
        .addEventListener('click', () => {
          mesAtual -= 1;

          if (mesAtual < 0) {
            mesAtual = 11;
            anoAtual -= 1;
          }

          // Redefine o dia selecionado para hoje se for o mês atual,
          // ou para o primeiro dia do mês, evitando datas inválidas
          // (ex: dia 31 em fevereiro).
          if (anoAtual === hoje.getFullYear() && mesAtual === hoje.getMonth()) {
            diaSelecionadoISO = hojeISO;
          } else {
            diaSelecionadoISO = ReservasApp.toISODate(anoAtual, mesAtual, 1);
          }

          renderCalendario();
          atualizarURL();
        });

      document
        .getElementById('calNext')
        .addEventListener('click', () => {
          mesAtual += 1;

          if (mesAtual > 11) {
            mesAtual = 0;
            anoAtual += 1;
          }

          // Redefine o dia selecionado para hoje se for o mês atual,
          // ou para o primeiro dia do mês, evitando datas inválidas.
          if (anoAtual === hoje.getFullYear() && mesAtual === hoje.getMonth()) {
            diaSelecionadoISO = hojeISO;
          } else {
            diaSelecionadoISO = ReservasApp.toISODate(anoAtual, mesAtual, 1);
          }

          renderCalendario();
          atualizarURL();
        });

      // Renderiza imediatamente com os dados locais (pode estar vazio
      // se o localStorage não tiver nada). O subscribe garante
      // re-renderização assim que a sincronização com o banco terminar.
      try {
        renderCalendario();
        console.log('Calendário renderizado. Mês:', ReservasApp.mesLabel(anoAtual, mesAtual));
      } catch (erro) {
        console.error('Calendário: Erro ao renderizar:', erro);
      }

      ReservasApp.subscribe(() => {
        try {
          renderCalendario();
        } catch (erro) {
          console.error('Calendário: Erro no subscribe:', erro);
        }
      });
    }); 
 