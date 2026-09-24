/**
 * menu.js
 * Controla o menu de perfil e a navegação móvel.
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
