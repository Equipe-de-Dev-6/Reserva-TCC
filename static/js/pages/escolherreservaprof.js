// ============================================================
// escolherreservaprof.js
// ============================================================
//
// Tela de escolha de sala. A montagem dos cards e a busca são feitas
// pelo /js/salas.js, que lê GET /salas e gera os cards dentro de
// [data-lista-salas]. Esta página cuida apenas do menu de perfil e do
// menu lateral do celular.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ------------------------------------------------------------
  // MENU DE PERFIL
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // MENU MOBILE
  // ------------------------------------------------------------

  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (menuToggle && sidebar && sidebarOverlay) {

    menuToggle.addEventListener('click', () => {

      sidebar.classList.toggle('open');
      sidebarOverlay.classList.add('active');

    });

    sidebarOverlay.addEventListener('click', () => {

      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');

    });

  }

});