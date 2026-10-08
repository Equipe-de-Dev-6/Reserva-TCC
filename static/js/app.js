// ============================================================
// app.js
// ============================================================
//
// O comportamento que é igual em todas as telas.
//
// Antes, o menu de perfil e o menu lateral do celular estavam
// copiados em 12 dos 14 arquivos de static/js/pages/. Mudar o
// comportamento do menu exigia editar 12 arquivos, e qualquer
//screen que ficasse de fora ficava sem menu.
//
// Aqui fica uma vez só. O resto dos scripts de página cuida apenas do
// que é específico dela.
//
// ============================================================


// ============================================================
// MENU DE PERFIL
// ============================================================

/**
 * Abre e fecha o menu que desce do avatar.
 *
 * O clique fora do menu fecha, e o clique dentro não conta — senão o
 * clique que abriu fecharia na mesma hora.
 */
function iniciarMenuDePerfil() {

  const perfil = document.getElementById('userProfile');
  const menu = document.getElementById('userDropdown');

  if (!perfil || !menu) {
    return;
  }

  perfil.addEventListener('click', (evento) => {

    evento.stopPropagation();

    if (menu.contains(evento.target)) {
      return;
    }

    menu.classList.toggle('active');

  });

  document.addEventListener('click', (evento) => {

    if (!perfil.contains(evento.target)) {
      menu.classList.remove('active');
    }

  });

}


// ============================================================
// MENU LATERAL DO CELULAR
// ============================================================

/**
 * Abre e fecha a barra de navegação em tela estreita.
 */
function iniciarMenuLateral() {

  const botao = document.getElementById('menuToggle');
  const barra = document.querySelector('.sidebar');
  const fundo = document.getElementById('sidebarOverlay');

  if (!botao || !barra || !fundo) {
    return;
  }

  botao.addEventListener('click', () => {

    barra.classList.toggle('open');
    fundo.classList.add('active');

  });

  fundo.addEventListener('click', () => {

    barra.classList.remove('open');
    fundo.classList.remove('active');

  });

}


// ============================================================
// CAMPO DE BUSCA
// ============================================================

/**
 * Filtra os itens marcados com "searchable" conforme o que for
 * digitado.
 *
 * Os itens são marcados pela tela, e a busca usa delegação de evento
 * porque essa lista costuma ser montada depois que a página carrega
 * (é o caso dos cards de sala, que vêm da API).
 *
 * A ordem importa: os cards precisam existir antes da primeira
 * digitação. Por isso initBusca roda depois de initSalas, e não
 * apenas no DOMContentLoaded.
 */
function iniciarBusca(seletorDaLista) {

  const campo = document.getElementById('search-input');

  if (!campo) {
    return;
  }

  const lista = seletorDaLista
    ? document.querySelector(seletorDaLista)
    : document;

  if (!lista) {
    return;
  }

  campo.addEventListener('input', () => {

    const termo = campo.value
      .toLowerCase()
      .trim();

    lista
      .querySelectorAll('.searchable')
      .forEach((item) => {

        const texto = item.textContent.toLowerCase();

        item.style.display = texto.includes(termo) ? '' : 'none';

      });

  });

}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

// As funções acima são globais de propósito: os módulos de página
// precisam de iniciarBusca() depois de montar os itens que ela filtra.
// Por isso o registro é feito por uma lista, e não por uma chamada
// automática — um carregamento duplo abriria os dois menus ao mesmo
// tempo.
const _iniciais = [
  iniciarMenuDePerfil,
  iniciarMenuLateral,
  () => iniciarBusca(),
];


function iniciarTudo() {

  _iniciais.forEach((inicial) => inicial());

}


// Este script entra antes do módulo da página: ele é clássico, e o
// outro é type="module", que o navegador adia. Assim o app.js já está
// pronto quando a tela chama iniciarBusca().
document.addEventListener('DOMContentLoaded', iniciarTudo);