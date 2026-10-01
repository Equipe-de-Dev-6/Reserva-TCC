// ============================================================
// ANIMAÇÕES E INTERAÇÃO
//
// A lista de salas, a busca e a seleção dos cards ficam em
// /js/salas.js, que monta os cards a partir de GET /salas.
// Aqui ficam apenas os comportamentos que não dependem da
// lista: menu de perfil e menu mobile.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // Menu de Perfil

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
