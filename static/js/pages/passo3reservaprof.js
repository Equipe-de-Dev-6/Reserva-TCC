document.addEventListener('DOMContentLoaded', () => {

      // Confirma a reserva rascunhada no Passo 02
      // e adiciona à lista definitiva de reservas
      // com status "Aguardando".
      ReservasApp.commitStagedReserva();


      // =====================================================
      // DROPDOWN DO USUÁRIO
      // =====================================================

      const userProfile =
        document.getElementById('userProfile');

      const userDropdown =
        document.getElementById('userDropdown');


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


      // =====================================================
      // MENU MOBILE
      // =====================================================

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

    });
