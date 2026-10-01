// ==========================================================
// avisos.js
// ==========================================================
//
// Lógica compartilhada dos "Avisos Importantes".
//
// Como funciona (sem backend):
//
// 1. Na página "Avisos" (/avisos_prof), o professor preenche o
//    formulário e clica em "Publicar Aviso". O aviso é guardado
//    em memória, no próprio navegador.
//
// 2. A lista vive no estado do módulo. Como o localStorage foi
//    removido, cada carregamento de página começa com a lista
//    vazia e os avisos somem ao recarregar. Quando existir o
//    backend de avisos, basta trocar o _saveAvisos por uma
//    chamada à API.
//
// 3. AvisosApp.subscribe(fn) permite que uma página "escute"
//    mudanças (criação/exclusão) feitas nela mesma e sempre
//    re-renderize a lista sem precisar chamar a função de render
//    manualmente em cada ação.
//
// ==========================================================

const AvisosApp = (() => {

  // ========================================================
  // ESTADO
  // ========================================================

  let avisos = [];

  const _listeners = [];


  // ========================================================
  // UTILITÁRIOS INTERNOS
  // ========================================================

  function _uid() {

    return 'a_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

  }


  function _notify() {

    _listeners.forEach((fn) => fn());

  }


  // ========================================================
  // LEITURA / ESCRITA
  // ========================================================

  function getAvisos() {

    // Mais recentes primeiro.
    return [...avisos].sort(
      (a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)
    );

  }


  function _saveAvisos(lista) {

    // Guarda uma cópia, para que a tela não segure uma
    // referência que muda por baixo dos panos.
    avisos = [...lista];

    return true;

  }


  // ========================================================
  // CRIAR AVISO
  // ========================================================

  function addAviso({ titulo, descricao, data }) {

    const aviso = {
      id: _uid(),
      titulo: (titulo || '').trim(),
      descricao: (descricao || '').trim(),
      data: data || '',
      criadoEm: new Date().toISOString(),
    };

    const lista = getAvisos();

    lista.unshift(aviso);

    _saveAvisos(lista);

    _notify();

    return aviso;

  }


  // ========================================================
  // EXCLUIR AVISO
  // ========================================================

  function deleteAviso(id) {

    const lista = getAvisos().filter((a) => a.id !== id);

    const ok = _saveAvisos(lista);

    _notify();

    return ok;

  }


  // ========================================================
  // INSCRIÇÃO PARA ATUALIZAÇÕES (mesma página)
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

    const partes = isoDate.split('-');

    if (partes.length !== 3) {

      return isoDate;

    }

    const [ano, mes, dia] = partes;

    return `${dia}/${mes}/${ano}`;

  }


  return {
    getAvisos,
    addAviso,
    deleteAviso,
    subscribe,
    formatDateBR,
  };

})();
