document.addEventListener('DOMContentLoaded', () => {

  // ======================================================
  // DROPDOWN DO USUÁRIO
  // ======================================================
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

  // ======================================================
  // BUSCA (cabeçalho e campo da tabela filtram as mesmas linhas)
  // ======================================================
  const headerSearch = document.getElementById('search-input');
  const tableSearch = document.getElementById('tableSearch');
  const tbody = document.getElementById('roomsBody');
  const emptyMessage = document.getElementById('tableEmpty');
  const countLabel = document.getElementById('countLabel');

  function atualizarContagem() {
    const total = tbody.querySelectorAll('tr').length;
    const visiveis = [...tbody.querySelectorAll('tr')]
      .filter((tr) => tr.style.display !== 'none').length;

    countLabel.textContent =
      'Mostrando ' + visiveis + ' de ' + total + ' salas cadastradas';

    emptyMessage.classList.toggle('active', visiveis === 0);
  }

  function filtrar(termo) {
    const busca = termo.toLowerCase().trim();

    tbody.querySelectorAll('tr').forEach((tr) => {
      tr.style.display =
        tr.textContent.toLowerCase().includes(busca) ? '' : 'none';
    });

    atualizarContagem();
  }

  [headerSearch, tableSearch].forEach((input) => {
    if (!input) return;

    input.addEventListener('input', (e) => {
      // Mantém os dois campos sincronizados
      if (headerSearch && input !== headerSearch) headerSearch.value = e.target.value;
      if (tableSearch && input !== tableSearch) tableSearch.value = e.target.value;

      filtrar(e.target.value);
    });
  });

  // ======================================================
  // EXCLUIR SALA
  // ======================================================
  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete-id]');
    if (!btn) return;

    const linha = btn.closest('tr');
    const nome = linha.querySelector('.room-name span').textContent;

    if (!window.confirm('Excluir "' + nome + '" definitivamente?')) return;

    // TODO: chamar a rota de exclusão do backend, ex.:
    // fetch('/salas/' + btn.dataset.deleteId, { method: 'DELETE' })
    linha.remove();
    atualizarContagem();
  });

  atualizarContagem();
});