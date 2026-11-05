// ==========================================================
// avisos.js
// ==========================================================
//
// Logica compartilhada dos "Avisos Importantes".
//
// Como funciona:
//
// 1. Os avisos ficam no banco de dados (tabela "avisos", via /api/avisos),
//    e sao compartilhados entre professores e coordenadores.
// 2. A leitura e sincronizacao sao feitas pela API, como o reservas.js faz
//    com /reservas.
// 3. AvisosApp.subscribe(fn) permite que uma pagina "escute" mudancas
//    e sempre se re-renderize sem precisar chamar o render na mão.
// ==========================================================

const AvisosApp = (() => {

  // ========================================================
  // ESTADO
  // ========================================================

  let avisos = null;

  const _listeners = [];

  // ========================================================
  // ESCAPE DE HTML (previne XSS)
  // ========================================================

  function escapar(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }


  // ========================================================
  // UTILITÁRIOS INTERNOS
  // ========================================================

  function _notify() {

    _listeners.forEach((fn) => {

      try { fn(); } catch (e) { /* nao quebrar outras telas */ }

    });

  }


  // ========================================================
  // API
  // ========================================================

  async function _fetchAvisos() {

    const resposta = await fetch('/api/avisos', {
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin'
    });

    if (!resposta.ok) {

      throw new Error('Falha ao buscar avisos');

    }

    const dados = await resposta.json();

    return Array.isArray(dados) ? dados : [];

  }


  async function _criarAvisoApi({ titulo, descricao, data }) {

    const resposta = await fetch('/api/avisos', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      credentials: 'same-origin',

      body: JSON.stringify({ titulo, descricao, data })

    });

    if (!resposta.ok) {

      const corpo = await resposta.json().catch(() => ({}));

      throw new Error(corpo.detail || 'Falha ao publicar o aviso.');

    }

    return await resposta.json();

  }


  async function _excluirAvisoApi(id) {

    const resposta = await fetch(`/api/avisos/${id}`, {

      method: 'DELETE',

      credentials: 'same-origin'

    });

    if (!resposta.ok) {

      const corpo = await resposta.json().catch(() => ({}));

      throw new Error(corpo.detail || 'Falha ao excluir o aviso.');

    }

    return await resposta.json();

  }


  // ========================================================
  // LEITURA / ESCRITA
  // ========================================================

  async function getAvisos() {

    if (avisos === null) {

      avisos = await _fetchAvisos();

    }

    // Mais recentes primeiro.
    return [...avisos].sort(

      (a, b) => new Date(b.criado_em || b.criadoEm || 0) - new Date(a.criado_em || a.criadoEm || 0)

    );

  }


  async function addAviso({ titulo, descricao, data }) {

    const gravado = await _criarAvisoApi({ titulo, descricao, data });

    // Recarrega a lista para ficar consistente com o banco.
    avisos = null;

    const lista = await getAvisos();

    avisos = lista;

    _notify();

    return gravado;

  }


  async function deleteAviso(id) {

    await _excluirAvisoApi(id);

    avisos = null;

    const lista = await getAvisos();

    avisos = lista;

    _notify();

    return true;

  }


  // ========================================================
  // INSCRIÇÃO PARA ATUALIZAÇÕES
  // ========================================================

  function subscribe(fn) {

    if (typeof fn === 'function') {

      _listeners.push(fn);

    }

  }


  // ========================================================
  // FORMATAÇÃO DE DATA (dd/mm/aaaa)
  // ========================================================

  function formatDateBR(isoDate) {

    if (!isoDate) {

      return '';

    }

    const partes = String(isoDate).split('T')[0].split('-');

    if (partes.length !== 3) {

      return isoDate;

    }

    const [ano, mes, dia] = partes;

    return `${dia}/${mes}/${ano}`;

  }


  // Sincroniza com o banco (força recarga).
  async function sincronizar() {

    avisos = null;

    await getAvisos();

    _notify();

  }


  return {

    getAvisos,

    addAviso,

    deleteAviso,

    subscribe,

    formatDateBR,

    sincronizar

  };

})();


// ============================================================
// GLOBAL
// ============================================================
//
// O "const" do topo de um script cria um binding no escopo léxico
// global, e não uma propriedade de "window". Quem chama por
// "window.AvisosApp" — como o "notificacoes-push.js" faz para conferir
// se o módulo está carregado — receberia "undefined" e desligaria a
// notificação silenciosamente. Por isso o global é publicado
// explicitamente aqui.
window.AvisosApp = AvisosApp;
