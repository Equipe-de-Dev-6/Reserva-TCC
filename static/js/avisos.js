// ==========================================================
// avisos.js
// ==========================================================
//
// Lógica compartilhada dos "Avisos Importantes".
//
// Como funciona (sem backend):
//
// 1. Na página "Avisos" (/avisos_prof), o professor preenche o
//    formulário e clica em "Publicar Aviso". O aviso é salvo em
//    localStorage("senai_avisos_professor").
//
// 2. A Página Inicial (/home) lê essa mesma lista para montar o
//    bloco "Avisos importantes". Como os dois lugares leem do
//    mesmo localStorage, o que for criado em um aparece no outro
//    automaticamente (e vice-versa).
//
// 3. AvisosApp.subscribe(fn) permite que uma página "escute"
//    mudanças (criação/exclusão) feitas nela mesma e sempre
//    re-renderize a lista sem precisar chamar a função de render
//    manualmente em cada ação.
//
// ==========================================================

const AvisosApp = (() => {

  const STORAGE_KEY = 'senai_avisos_professor';

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

    try {

      const raw = localStorage.getItem(STORAGE_KEY);

      const lista = raw ? JSON.parse(raw) : [];

      // Mais recentes primeiro.
      return lista.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

    } catch (e) {

      console.error('Erro ao ler avisos:', e);

      return [];

    }

  }


  function _saveAvisos(lista) {

    try {

      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));

      return true;

    } catch (e) {

      console.error('Erro ao salvar avisos:', e);

      return false;

    }

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
