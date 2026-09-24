document.addEventListener('DOMContentLoaded', () => {

      const userProfile = document.getElementById('userProfile');
      const userDropdown = document.getElementById('userDropdown');

      if (userProfile && userDropdown) {

        userProfile.addEventListener('click', (e) => {

          e.stopPropagation();

          if (userDropdown.contains(e.target)) return;

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

      const reservaForm = document.getElementById('reservaForm');

      if (reservaForm) {

        reservaForm.addEventListener('submit', (e) => {

          e.preventDefault();

          if (!reservaForm.checkValidity()) {

            reservaForm.reportValidity();

            return;

          }

          ReservasApp.stageReserva(reservaForm);

          window.location.href = '/passo03_reserva_prof';

        });

      }

    });
