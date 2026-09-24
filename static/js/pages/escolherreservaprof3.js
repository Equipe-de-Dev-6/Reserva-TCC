document.addEventListener('DOMContentLoaded', () => {

      // ========================================================
      // MENU DE PERFIL
      // ========================================================

      const userProfile =
        document.getElementById('userProfile');

      const userDropdown =
        document.getElementById('userDropdown');

      if (userProfile && userDropdown) {

        userProfile.addEventListener('click', (e) => {

          e.stopPropagation();

          // Não fecha o dropdown ao clicar dentro dele
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

      // ========================================================
      // BARRA DE PESQUISA
      // ========================================================

      const searchInput =
        document.getElementById('search-input');

      const itemsToSearch =
        document.querySelectorAll('.searchable');

      if (searchInput) {

        searchInput.addEventListener('input', (e) => {

          const searchTerm =
            e.target.value.toLowerCase().trim();

          itemsToSearch.forEach((item) => {

            const text =
              item.textContent.toLowerCase();

            item.style.display =
              text.includes(searchTerm) ? '' : 'none';

          });

        });

      }

      // ========================================================
      // SELEÇÃO DOS GABINETES
      // ========================================================

      const roomCards =
        document.querySelectorAll('.room-card');

      roomCards.forEach((card) => {

        card.addEventListener('click', (e) => {

          // Gabinete negado não pode ser selecionado
          if (card.dataset.status === 'negado') {

            e.preventDefault();

            return;

          }

          // Remove seleção dos outros gabinetes
          roomCards.forEach((c) => {

            c.classList.remove('selected');

          });

          // Seleciona o gabinete atual
          card.classList.add('selected');

          // Guarda o gabinete selecionado
          sessionStorage.setItem(
            'salaSelecionada',
            card.dataset.sala || ''
          );

          // Impede o href="#"
          e.preventDefault();

          // Redireciona para o Passo 02
          setTimeout(() => {

            window.location.href =
              '/passo02_reserva_prof';

          }, 300);

        });

      });

      // ========================================================
      // MENU MOBILE
      // ========================================================

      const menuToggle =
        document.getElementById('menuToggle');

      const sidebar =
        document.querySelector('.sidebar');

      const sidebarOverlay =
        document.getElementById('sidebarOverlay');

      if (menuToggle && sidebar && sidebarOverlay) {

        // Abre/fecha o menu
        menuToggle.addEventListener('click', () => {

          sidebar.classList.toggle('open');

          sidebarOverlay.classList.toggle('active');

        });

        // Fecha ao clicar no overlay
        sidebarOverlay.addEventListener('click', () => {

          sidebar.classList.remove('open');

          sidebarOverlay.classList.remove('active');

        });

      }

    });
