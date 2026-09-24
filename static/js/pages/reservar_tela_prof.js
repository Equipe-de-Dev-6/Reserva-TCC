document.addEventListener('DOMContentLoaded', () => {

      // ======================================================
      // NOME DINÂMICO DO USUÁRIO LOGADO PELA SESSÃO
      // ======================================================
// ======================================================
      // DROPDOWN DO USUÁRIO
      // ======================================================

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

      // ======================================================
      // PESQUISA
      // ======================================================

      const searchInput = document.getElementById('search-input');
      const cards = document.querySelectorAll('.large-action-card');

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const searchTerm = e.target.value.toLowerCase().trim();

          cards.forEach(card => {
            const titleElement = card.querySelector('h3');
            const descElement = card.querySelector('p');

            if (titleElement && descElement) {
              const title = titleElement.textContent.toLowerCase();
              const description = descElement.textContent.toLowerCase();

              card.style.display =
                title.includes(searchTerm) || description.includes(searchTerm)
                  ? 'flex'
                  : 'none';
            }
          });
        });
      }

      // ======================================================
      // MENU MOBILE
      // ======================================================

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

    });
