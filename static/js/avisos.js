// ==========================================================
// avisos.js
// ==========================================================
//
// Logica compartilhada dos "Avisos Importantes".
//
// Como funciona:
//
// 1. Na pagina "Avisos" (/avisos), o professor preenche o formulario e
//    clica em "Publicar Aviso". O aviso fica guardado no navegador, em
//    localStorage, e volta quando a pagina recarrega.
//
// 2. A lista e por navegador, e nao e compartilhada: um aviso publicado
//    na maquina de um professor nao aparece para os outros. Quando houver
//    backend de avisos, basta trocar os _ler/_gravar por chamadas a API,
//    como o reservas.js faz com /reservas.
//
// 3. AvisosApp.subscribe(fn) permite que uma pagina "escute" mudancas
//    (criacao/exclusao) feitas nela mesma e sempre se re-renderize sem
//    precisar chamar a funcao de render manualmente.
//
// ==========================================================

const AvisosApp = (() => {

  // ========================================================
  // ESTADO
  // ========================================================

  // O prefixo evita colisao com outro sistema na mesma origem.
  const CHAVE = 'reservaSenaiAvisos';

  // null ate a primeira leitura, para o localStorage ser aberto uma vez.
  let avisos = null;

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
  // PERSISTENCIA
  // ========================================================

  function _ler() {

    if (avisos !== null) {

      return avisos;

    }

    try {

      const bruto = localStorage.getItem(CHAVE);

      const guardado = bruto ? JSON.parse(bruto) : [];

      avisos = Array.isArray(guardado) ? guardado : [];

    } catch (erro) {

      // localStorage indisponivel (modo anonimo) ou conteudo corrompido:
      // os avisos passam a durar so a aba aberta, em vez de a tela
      // inteira quebrar.
      avisos = [];

    }

    return avisos;

  }


  function _gravar(lista) {

    // Guarda uma copia, para que a tela nao segure uma referencia que
    // muda por baixo dos panos.
    avisos = [...lista];

    try {

      localStorage.setItem(CHAVE, JSON.stringify(avisos));

    } catch (erro) {

      // Sem espaco em disco, por exemplo: a lista continua valendo
      // enquanto a aba estiver aberta.

    }

    return true;

  }


  // ========================================================
  // LEITURA / ESCRITA
  // ========================================================

  function getAvisos() {

    // Mais recentes primeiro.
    return [..._ler()].sort(
      (a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)
    );

  }


  function _saveAvisos(lista) {

    return _gravar(lista);

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
