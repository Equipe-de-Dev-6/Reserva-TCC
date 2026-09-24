// ======================================================
    // CARREGAR USUÁRIO LOGADO
    // ======================================================


    document.addEventListener('DOMContentLoaded', () => {
// ======================================================
      // DROPDOWN DO USUÁRIO
      // ======================================================
      const userProfile = document.getElementById('userProfile');
      const userDropdown = document.getElementById('userDropdown');

      if (userProfile && userDropdown) {
        userProfile.addEventListener('click', (e) => {
          e.stopPropagation();
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
      // ABRIR / FECHAR FORMULÁRIO DE NOVO AVISO
      // ======================================================
      const btnCriarAviso = document.getElementById('btnCriarAviso');
      const avisoFormCard = document.getElementById('avisoFormCard');
      const avisoForm = document.getElementById('avisoForm');
      const btnCancelarAviso = document.getElementById('btnCancelarAviso');

      function abrirFormulario() {
        avisoFormCard.classList.add('active');
        document.getElementById('avisoTitulo').focus();
      }

      function fecharFormulario() {
        avisoFormCard.classList.remove('active');
        avisoForm.reset();
      }

      if (btnCriarAviso) {
        btnCriarAviso.addEventListener('click', () => {
          if (avisoFormCard.classList.contains('active')) {
            fecharFormulario();
          } else {
            abrirFormulario();
          }
        });
      }

      if (btnCancelarAviso) {
        btnCancelarAviso.addEventListener('click', fecharFormulario);
      }

      // ======================================================
      // ENVIAR NOVO AVISO
      // ======================================================
      if (avisoForm) {
        avisoForm.addEventListener('submit', (e) => {
          e.preventDefault();

          if (!avisoForm.checkValidity()) {
            avisoForm.reportValidity();
            return;
          }

          AvisosApp.addAviso({
            titulo: document.getElementById('avisoTitulo').value,
            descricao: document.getElementById('avisoDescricao').value,
            data: document.getElementById('avisoData').value,
          });

          fecharFormulario();
        });
      }

      // ======================================================
      // RENDERIZAR LISTA DE AVISOS
      // ======================================================
      function renderAvisos() {
        const lista = AvisosApp.getAvisos();
        const listaEl = document.getElementById('avisosList');
        const emptyEl = document.getElementById('avisosEmpty');

        if (lista.length === 0) {
          listaEl.innerHTML = '';
          emptyEl.style.display = 'flex';
          return;
        }

        emptyEl.style.display = 'none';

        listaEl.innerHTML = lista.map((a) => {
          const dataFormatada = AvisosApp.formatDateBR(a.data);

          return `
            <div class="notice-card searchable" data-id="${a.id}">
              <div class="notice-card-main">
                <div class="notice-title">
                  <img src="/assets/icons/warning.png" alt="" width="20" height="20">
                  ${a.titulo}
                </div>

                <p>${a.descricao}</p>

                ${dataFormatada ? `<p class="notice-data">Referente a ${dataFormatada}</p>` : ''}
              </div>

              <button class="btn-excluir-aviso" data-delete-id="${a.id}">
                Excluir
              </button>
            </div>
          `;
        }).join('');
      }

      // ======================================================
      // EXCLUIR AVISO
      // ======================================================
      document.getElementById('avisosList').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-delete-id]');

        if (!btn) {
          return;
        }

        const confirmar = window.confirm(
          'Tem certeza que deseja excluir este aviso?'
        );

        if (!confirmar) {
          return;
        }

        AvisosApp.deleteAviso(btn.dataset.deleteId);
      });

      // ======================================================
      // BUSCA
      // ======================================================
      const searchInput = document.getElementById('search-input');

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const termo = e.target.value.toLowerCase().trim();

          document.querySelectorAll('.notice-card').forEach((card) => {
            const texto = card.textContent.toLowerCase();
            card.style.display = texto.includes(termo) ? '' : 'none';
          });
        });
      }

      // ======================================================
      // ATUALIZAÇÃO AUTOMÁTICA DA LISTA
      // ======================================================
      AvisosApp.subscribe(renderAvisos);

      renderAvisos();
    });
