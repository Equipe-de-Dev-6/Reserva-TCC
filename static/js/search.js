/**
 * search.js
 * Filtra elementos marcados com .searchable pelo campo de pesquisa.
 */

export function inicializarBusca(seletor = '.searchable') {
  const searchInput = document.getElementById('search-input');

  if (!searchInput) {
    return;
  }

  const items = document.querySelectorAll(seletor);

  searchInput.addEventListener('input', (event) => {
    const termo = event.target.value.toLowerCase().trim();

    items.forEach((item) => {
      const texto = item.textContent.toLowerCase();
      item.style.display = texto.includes(termo) ? '' : 'none';
    });
  });
}
