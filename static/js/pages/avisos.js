// ======================================================
// PÁGINA DE AVISOS (/avisos)
// ======================================================

document.addEventListener('DOMContentLoaded', async () => {

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
    avisoForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!avisoForm.checkValidity()) {
        avisoForm.reportValidity();
        return;
      }

      const btn = avisoForm.querySelector('button[type="submit"]');
      const textoOriginal = btn.textContent;

      btn.disabled = true;
      btn.textContent = 'Publicando...';

      try {

        await AvisosApp.addAviso({
          titulo: document.getElementById('avisoTitulo').value,
          descricao: document.getElementById('avisoDescricao').value,
          data: document.getElementById('avisoData').value,
        });

        fecharFormulario();

      } catch (erro) {

        console.error('Erro ao publicar aviso:', erro);
        window.alert(erro.message || 'Não foi publicar o aviso.');

      } finally {

        btn.disabled = false;
        btn.textContent = textoOriginal;

      }
    });
  }

  // ======================================================
  // RENDERIZAR LISTA DE AVISOS
  // ======================================================
  async function renderAvisos() {

    let lista = [];

    try {

      lista = await AvisosApp.getAvisos();

    } catch (erro) {

      console.error('Erro ao carregar avisos:', erro);

      const listaEl = document.getElementById('avisosList');
      const emptyEl = document.getElementById('avisosEmpty');

      if (listaEl) listaEl.innerHTML = '';
      if (emptyEl) {
        emptyEl.style.display = 'flex';
        emptyEl.querySelector('p').textContent =
          'Não foi possível carregar os avisos.';
      }

      return;

    }

    const listaEl = document.getElementById('avisosList');
    const emptyEl = document.getElementById('avisosEmpty');

    if (lista.length === 0) {

      if (listaEl) listaEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';

      return;

    }

    if (emptyEl) emptyEl.style.display = 'none';

    function escapar(texto) {

      return String(texto ?? '')

        .replace(/&/g, '&amp;')

        .replace(/</g, '&lt;')

        .replace(/>/g, '&gt;')

        .replace(/"/g, '&quot;')

        .replace(/'/g, '&#39;');

    }

    function formatarDataBR(iso) {

      if (!iso) return '';

      const partes = String(iso).split('T')[0].split('-');

      if (partes.length !== 3) return iso;

      return `${partes[2]}/${partes[1]}/${partes[0]}`;

    }

    if (listaEl) {

      listaEl.innerHTML = lista.map((a) => {

        const dataFormatada = formatarDataBR(a.data);

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

            <button class="btn-excluir-aviso" data-delete-id="${a.id}">
              Excluir
            </button>
          </div>
        `;

      }).join('');

    }

  }

  // ======================================================
  // EXCLUIR AVISO
  // ======================================================
  document.getElementById('avisosList').addEventListener('click', async (e) => {

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

    try {

      await AvisosApp.deleteAviso(btn.dataset.deleteId);

    } catch (erro) {

      console.error('Erro ao excluir aviso:', erro);

      window.alert(erro.message || 'Não foi possível excluir o aviso.');

    }

  });

  // ======================================================
  // BUSCA
  // ======================================================

  // ======================================================
  // ATUALIZAÇÃO AUTOMÁTICA DA LISTA
  // ======================================================
  AvisosApp.subscribe(() => {

    renderAvisos();

  });

  renderAvisos();

});
