/**
 * search.js
 * Filtra elementos marcados com .searchable pelo campo de pesquisa.
 *
 * Fluxo:
 * 1. Localiza o campo de busca pelo id "search-input".
 * 2. Se não existir, não faz nada.
 * 3. Localiza todos os itens com a classe passada (padrão: .searchable).
 * 4. A cada "input" no campo, filtra os itens: mostra apenas os que
 *    contêm o termo digitado (case-insensitive, espaços nas pontas
 *    ignorados).
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
