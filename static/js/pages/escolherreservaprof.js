// ============================================================
// escolherreservaprof.js
// ============================================================
//
// Tela de escolha de sala. A montagem dos cards e a busca são feitas
// pelo /js/salas.js, que lê GET /salas e gera os cards dentro de
// [data-lista-salas]. Esta página cuida apenas do menu de perfil e do
// menu lateral do celular (já tratados por /js/app.js).
//
// Este arquivo existe como ponto de extensão por tela. Atualmente não
// contém lógica própria porque:
//   - O menu de perfil e o menu lateral já estão em app.js.
//   - Os cards de sala são montados por salas.js.
//   - O campo de busca é iniciado por app.js (iniciarBusca).
//
// Se uma tela específica precisar de comportamento extra, adicione-o
// aqui dentro do DOMContentLoaded.
document.addEventListener('DOMContentLoaded', () => {

  // ------------------------------------------------------------
  // MENU DE PERFIL (já iniciado em /js/app.js)
  // ------------------------------------------------------------


  // ------------------------------------------------------------
  // (sem lógica específica nesta tela por enquanto)

});
