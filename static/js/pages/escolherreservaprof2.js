document.addEventListener('DOMContentLoaded', () => {

      // Menu de perfil

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

      // Barra de pesquisa

      const searchInput =
        document.getElementById('search-input');

      const itemsToSearch =
        document.querySelectorAll('.searchable');

      if (searchInput) {

        searchInput.addEventListener('input', (e) => {

          const searchTerm =
            e.target.value
              .toLowerCase()
              .trim();

          itemsToSearch.forEach((item) => {

            const text =
              item.textContent.toLowerCase();

            item.style.display =
              text.includes(searchTerm)
                ? ''
                : 'none';

          });

        });

      }

      // Seleção dos laboratórios

      const roomCards =
        document.querySelectorAll('.room-card');

      roomCards.forEach((card) => {

        card.addEventListener('click', (e) => {

          e.preventDefault();

          // Laboratório negado não avança
          if (card.dataset.status === 'negado') {
            return;
          }

          roomCards.forEach((c) => {
            c.classList.remove('selected');
          });

          card.classList.add('selected');

          sessionStorage.setItem(
            'salaSelecionada',
            card.dataset.sala || ''
          );

          // Redireciona para o Passo 02
          setTimeout(() => {

            window.location.href =
              '/passo02_reserva_prof';

          }, 300);

        });

      });

      // Menu mobile

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
