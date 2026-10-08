document.addEventListener('DOMContentLoaded', () => {

      // ======================================================
      // NOME DO USUÁRIO LOGADO
      // ======================================================
// ======================================================
      // PESQUISA
      // ======================================================

      const searchInput =
        document.getElementById('search-input');

      const itemsToSearch =
        document.querySelectorAll('.searchable');

      if (searchInput) {

        searchInput.addEventListener('input', (e) => {

          const searchTerm =
            e.target.value.toLowerCase().trim();

          itemsToSearch.forEach(item => {

            const text =
              item.textContent.toLowerCase();

            item.style.display =
              text.includes(searchTerm) ? '' : 'none';

          });

        });

      }


      // ======================================================
      // DROPDOWN DO USUÁRIO
      // ======================================================

      const userProfile =
        document.getElementById('userProfile');

      const userDropdown =
        document.getElementById('userDropdown');

      if (userProfile && userDropdown) {

        userProfile.addEventListener('click', (e) => {

          // Não fecha o dropdown ao clicar dentro dele
          e.stopPropagation();

          userDropdown.classList.toggle('active');

        });

        document.addEventListener('click', (e) => {

          if (!userProfile.contains(e.target)) {
            userDropdown.classList.remove('active');
          }

        });

      }


      // ======================================================
      // MENU MOBILE
      // ======================================================

      const menuToggle =
        document.getElementById('menuToggle');

      const sidebar =
        document.querySelector('.sidebar');

      const sidebarOverlay =
        document.getElementById('sidebarOverlay');

      if (menuToggle && sidebar && sidebarOverlay) {

        menuToggle.addEventListener('click', () => {

          sidebar.classList.toggle('open');
          sidebarOverlay.classList.toggle('active');

        });

        sidebarOverlay.addEventListener('click', () => {

          sidebar.classList.remove('open');
          sidebarOverlay.classList.remove('active');

        });

      }


      // ======================================================
      // ÍCONE DA CATEGORIA
      // ======================================================

      function iconeDaCategoria(categoria) {

        const cat =
          (categoria || '').toLowerCase();

        if (cat.includes('laborat')) {
          return '/assets/icons/computer.png';
        }

        if (cat.includes('gabinete')) {
          return '/assets/icons/shopping-cart.png';
        }

        return '/assets/icons/classroom.png';

      }


      // ======================================================
      // PRÓXIMAS RESERVAS
      // ======================================================

      function renderProximasReservas() {

        const listaEl =
          document.getElementById(
            'proximasReservasList'
          );

        const emptyEl =
          document.getElementById(
            'proximasReservasEmpty'
          );

        if (!listaEl || !emptyEl) return;

        const todas =
          ReservasApp.getReservas();

        const proximas =
          todas.slice(0, 4);

        if (proximas.length === 0) {

          listaEl.innerHTML = '';
          emptyEl.style.display = 'block';

          return;

        }

        emptyEl.style.display = 'none';

        listaEl.innerHTML = proximas.map(r => {

          const info =
            ReservasApp.statusInfo(r.status);

          const acoes =
            r.status === 'cancelada'
              ? ''
              : `
                                <button
                                    class="btn-cancelar-reserva btn-cancelar-sm"
                                    data-cancel-id="${r.id}"
                                >
                                    Cancelar Reserva
                                </button>
                            `;

          return `
                        <div
                            class="res-card searchable"
                            data-id="${r.id}"
                        >

                            <div class="res-left">

                                <div class="img-placeholder">

                                    <img
                                        src="${iconeDaCategoria(r.categoria)}"
                                        alt=""
                                        width="24"
                                        height="24"
                                    >

                                </div>

                                <div class="res-info">

                                    <h4>
                                        ${r.item || r.categoria}
                                    </h4>

                                    <p>
                                        ${ReservasApp.formatDateBR(r.data)}
                                        ·
                                        ${ReservasApp.formatHorario(
            r.horaEntrada,
            r.horaSaida
          )}
                                    </p>

                                </div>

                            </div>

                            <div class="res-right">

                                <span class="${info.badgeClass}">
                                    ${info.label}
                                </span>

                                ${acoes}

                                <button
                                    class="btn-excluir-reserva btn-cancelar-sm"
                                    data-delete-id="${r.id}"
                                >
                                    Excluir
                                </button>

                            </div>

                        </div>
                    `;

        }).join('');

      }


      // ======================================================
      // AÇÕES DAS RESERVAS
      // ======================================================

      const listaReservas =
        document.getElementById(
          'proximasReservasList'
        );

      if (listaReservas) {

        listaReservas.addEventListener('click', (e) => {

          const deleteButton =
            e.target.closest('[data-delete-id]');

          if (deleteButton) {

            const confirmar =
              window.confirm(
                'Excluir esta reserva definitivamente?'
              );

            if (!confirmar) return;

            ReservasApp.deleteReserva(
              deleteButton.dataset.deleteId
            );

            return;

          }

          const btn =
            e.target.closest('[data-cancel-id]');

          if (!btn) return;

          const confirmar =
            window.confirm(
              'Tem certeza que deseja cancelar esta reserva?'
            );

          if (!confirmar) return;

          ReservasApp.cancelReserva(
            btn.dataset.cancelId
          );

          renderProximasReservas();

        });

      }

      renderProximasReservas();


      // ======================================================
      // ATUALIZAÇÃO DAS RESERVAS
      // ======================================================

      ReservasApp.subscribe(() => {

        renderProximasReservas();
        renderCalendarioWidget();

      });


      // ======================================================
      // AVISOS IMPORTANTES (PRÉVIA)
      // ======================================================

      function renderAvisosPreview() {

        const listaEl =
          document.getElementById(
            'avisosPreviewList'
          );

        const emptyEl =
          document.getElementById(
            'avisosPreviewEmpty'
          );

        if (!listaEl || !emptyEl) return;

        const todos =
          AvisosApp.getAvisos();

        // Mostra os 3 avisos mais recentes
        const recentes =
          todos.slice(0, 3);

        if (recentes.length === 0) {

          listaEl.innerHTML = '';
          emptyEl.style.display = 'block';

          return;

        }

        emptyEl.style.display = 'none';

        listaEl.innerHTML = recentes.map(a => {

          return `
                        <a
                            href="/avisos"
                            class="notice-card searchable"
                        >

                            <div class="notice-title">

                                <img
                                    src="/assets/icons/warning.png"
                                    alt=""
                                    width="24"
                                    height="24"
                                >

                                ${a.titulo}

                            </div>

                            <p>
                                ${a.descricao}
                            </p>

                        </a>
                    `;

        }).join('');

      }

      renderAvisosPreview();


      // ======================================================
      // ATUALIZAÇÃO DOS AVISOS
      // ======================================================

      AvisosApp.subscribe(renderAvisosPreview);


      // ======================================================
      // CALENDÁRIO
      // ======================================================

      const hoje = new Date();

      let widgetAno =
        hoje.getFullYear();

      let widgetMes =
        hoje.getMonth();

      const hojeISO =
        ReservasApp.todayISO();


      function renderCalendarioWidget() {

        const labelEl =
          document.getElementById('homeCalLabel');

        const gridEl =
          document.getElementById('homeCalGrid');

        if (!labelEl || !gridEl) return;

        labelEl.textContent =
          ReservasApp.mesLabel(
            widgetAno,
            widgetMes
          );

        const celulas =
          ReservasApp.construirMatrizMes(
            widgetAno,
            widgetMes
          );

        // Remove os dias anteriores
        gridEl
          .querySelectorAll('.day-num')
          .forEach(el => el.remove());

        celulas.forEach(c => {

          const reservasDoDia =
            ReservasApp.getReservasPorData(
              c.iso
            );

          const anoDaCelula =
            parseInt(c.iso.slice(0, 4), 10);

          const mesDaCelula =
            parseInt(c.iso.slice(5, 7), 10) - 1;

          const el =
            document.createElement('a');

          // Abre o calendário na data selecionada
          el.href =
            `/calendario_prof?ano=${anoDaCelula}&mes=${mesDaCelula}&dia=${c.dia}`;

          const classes = ['day-num'];

          if (!c.mesAtual) {
            classes.push('muted');
          }

          if (c.iso === hojeISO) {
            classes.push('active');
          }

          if (reservasDoDia.length > 0) {
            classes.push('has-reservation');
          }

          el.className =
            classes.join(' ');

          el.textContent =
            c.dia;

          gridEl.appendChild(el);

        });

      }


      // ======================================================
      // MÊS ANTERIOR
      // ======================================================

      const homeCalPrev =
        document.getElementById('homeCalPrev');

      if (homeCalPrev) {

        homeCalPrev.addEventListener('click', () => {

          widgetMes -= 1;

          if (widgetMes < 0) {

            widgetMes = 11;
            widgetAno -= 1;

          }

          renderCalendarioWidget();

        });

      }


      // ======================================================
      // PRÓXIMO MÊS
      // ======================================================

      const homeCalNext =
        document.getElementById('homeCalNext');

      if (homeCalNext) {

        homeCalNext.addEventListener('click', () => {

          widgetMes += 1;

          if (widgetMes > 11) {

            widgetMes = 0;
            widgetAno += 1;

          }

          renderCalendarioWidget();

        });

      }


      // ======================================================
      // INICIALIZA CALENDÁRIO
      // ======================================================

      renderCalendarioWidget();

    });
