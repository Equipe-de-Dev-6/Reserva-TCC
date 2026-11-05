// ======================================================
    // CARREGAR USUÁRIO LOGADO
    // ======================================================

    document.addEventListener('DOMContentLoaded', () => {
// ======================================================
      // DROPDOWN DO USUÁRIO
      // ======================================================

      // ======================================================
      // MENU MOBILE
      // ======================================================

      

      

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
          }).then(() => fecharFormulario()).catch((erro) => alert(erro.message));
        });
      }

      // ======================================================
      // RENDERIZAR LISTA DE AVISOS
      // ======================================================
      // ESCAPE DE HTML (previne XSS em avisos publicados)
      // ======================================================
      function escapar(texto) {
        return String(texto ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

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
                  ${escapar(a.titulo)}
                </div>

                <p>${escapar(a.descricao)}</p>

                ${dataFormatada ? `<p class="notice-data">Referente a ${dataFormatada}</p>` : ''}
              </div>

              <button class="notice-delete" data-acao="excluir" data-id="${a.id}" type="button">
                Excluir
              </button>
            </div>
          `;
        }).join('');
      }

      // ======================================================
      // BUSCA

      

      // ======================================================
      // ATUALIZAÇÃO AUTOMÁTICA DA LISTA
      // ======================================================
      const listaEl = document.getElementById('avisosList');

      if (listaEl) {
        listaEl.addEventListener('click', async (evento) => {
          const botao = evento.target.closest('[data-acao="excluir"]');

          if (!botao) {
            return;
          }

          const id = Number(botao.dataset.id);

          if (!window.confirm('Excluir este aviso?')) {
            return;
          }

          try {
            await AvisosApp.deleteAviso(id);

          } catch (erro) {
            window.alert(erro.message || 'Nao foi possivel excluir o aviso.');
          }
        });
      }

      AvisosApp.subscribe(renderAvisos);

      renderAvisos();
    });
