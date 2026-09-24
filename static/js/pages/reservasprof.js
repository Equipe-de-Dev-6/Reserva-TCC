// Busca o nome do usuário autenticado pela sessão do FastAPI.


    document.addEventListener('DOMContentLoaded', () => {
const userProfile = document.getElementById('userProfile');
      const userDropdown = document.getElementById('userDropdown');

      if (userProfile && userDropdown) {
        userProfile.addEventListener('click', (e) => {
          e.stopPropagation();

          if (userDropdown.contains(e.target)) {
            return;
          }

          userDropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
          if (!userProfile.contains(e.target)) {
            userDropdown.classList.remove('active');
          }
        });
      }

      const menuToggle = document.getElementById('menuToggle');
      const sidebar = document.querySelector('.sidebar');
      const sidebarOverlay = document.getElementById('sidebarOverlay');

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

      function iconeDaCategoria(categoria) {
        const cat = (categoria || '').toLowerCase();

        if (cat.includes('laborat')) {
          return '/assets/icons/computer.png';
        }

        if (cat.includes('gabinete')) {
          return '/assets/icons/shopping-cart.png';
        }

        return '/assets/icons/classroom.png';
      }

      let filtroAtual = 'todas';

      function renderReservas() {
        const lista = ReservasApp.getReservas();
        const listaEl = document.getElementById('reservasList');
        const emptyEl = document.getElementById('reservasEmpty');

        const filtradas =
          filtroAtual === 'todas'
            ? lista
            : lista.filter((r) => r.status === filtroAtual);

        if (lista.length === 0) {
          listaEl.innerHTML = '';
          emptyEl.style.display = 'flex';
          return;
        }

        emptyEl.style.display = 'none';

        if (filtradas.length === 0) {
          listaEl.innerHTML =
            '<p style="color:#6B7280;font-size:13px;padding:12px 4px;">Nenhuma reserva encontrada para este filtro.</p>';
          return;
        }

        listaEl.innerHTML = filtradas.map((r) => {
          const info = ReservasApp.statusInfo(r.status);
          const dataFormatada = ReservasApp.formatDateBR(r.data);

          const horario = ReservasApp.formatHorario(
            r.horaEntrada,
            r.horaSaida
          );

          const acoes =
            r.status === 'cancelada'
              ? ''
              : '<button class="btn-cancelar-reserva" data-cancel-id="' +
              r.id +
              '">Cancelar Reserva</button>';

          return `
            <div
              class="reserva-card searchable"
              data-id="${r.id}"
            >
              <div class="reserva-left">
                <div class="reserva-icon">
                  <img
                    src="${iconeDaCategoria(r.categoria)}"
                    alt=""
                  >
                </div>

                <div class="reserva-info">
                  <h4>
                    ${r.item || r.categoria}
                  </h4>

                  <p>
                    ${r.curso ? r.curso + ' · ' : ''}
                    ${r.professor || ''}
                  </p>

                  <div class="reserva-meta">
                    <p>${dataFormatada}</p>
                    <p>${horario}</p>
                  </div>
                </div>
              </div>

              <div class="reserva-right">
                <span class="${info.badgeClass}">
                  ${info.label}
                </span>

                ${acoes}

                <button
                  class="btn-excluir-reserva"
                  data-delete-id="${r.id}"
                >
                  Excluir
                </button>
              </div>
            </div>
          `;
        }).join('');
      }

      const filterTabs = document.querySelectorAll('.filter-tab');

      filterTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          filterTabs.forEach((t) => t.classList.remove('active'));

          tab.classList.add('active');
          filtroAtual = tab.dataset.filter;

          renderReservas();
        });
      });

      document
        .getElementById('reservasList')
        .addEventListener('click', (e) => {

          const deleteButton = e.target.closest('[data-delete-id]');

          if (deleteButton) {
            if (!window.confirm(
              'Excluir esta reserva definitivamente?'
            )) {
              return;
            }

            ReservasApp.deleteReserva(
              deleteButton.dataset.deleteId
            );

            renderReservas();
            return;
          }

          const btn = e.target.closest('[data-cancel-id]');

          if (!btn) {
            return;
          }

          const confirmar = window.confirm(
            'Tem certeza que deseja cancelar esta reserva?'
          );

          if (!confirmar) {
            return;
          }

          ReservasApp.cancelReserva(
            btn.dataset.cancelId
          );

          renderReservas();
        });

      const searchInput = document.getElementById('search-input');

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const termo = e.target.value.toLowerCase().trim();

          document
            .querySelectorAll('.reserva-card')
            .forEach((card) => {
              const texto = card.textContent.toLowerCase();

              card.style.display =
                texto.includes(termo) ? '' : 'none';
            });
        });
      }

      renderReservas();
      ReservasApp.subscribe(() => renderReservas());
    });
