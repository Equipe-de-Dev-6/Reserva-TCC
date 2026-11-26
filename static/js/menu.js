/**
 * menu.js
 * Controla o menu de perfil e a navegação móvel.
 *
 * Fluxo:
 * 1. Se existirem os elementos de perfil/dropdown, liga o clique no
 *    avatar para abrir/fechar o menu, e o clique fora para fechar.
 * 2. Se existirem os elementos do menu mobile (toggle, sidebar,
 *    overlay), liga o clique no toggle para abrir/fechar a barra
 *    lateral, e o clique no overlay para fechar.
 */
export function inicializarMenu() {
  const userProfile = document.getElementById('userProfile');
  const userDropdown = document.getElementById('userDropdown');
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (userProfile && userDropdown) {
    userProfile.addEventListener('click', (event) => {
      event.stopPropagation();
      userDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (event) => {
      if (!userProfile.contains(event.target)) {
        userDropdown.classList.remove('active');
      }
    });
  }

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
}
