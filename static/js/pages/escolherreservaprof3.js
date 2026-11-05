// ============================================================
// escolherreservaprof3.js  —  tela de escolha de gabinetes
// ============================================================
//
// Esta tela monta os cards de gabinete pelo "/js/salas.js", que lê
// GET /salas e escreve dentro de [data-lista-salas]. A escolha e o
// avanço para o passo 02 também são feitos pelo salas.js.
//
// Este arquivo registra o listener de clique nos cards após a API
// responder, garantindo que a seleção funcione mesmo quando os cards
// são montados de forma assíncrona.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const container = document.querySelector('[data-lista-salas]');

  if (!container) {
    return;
  }

  // Delegação de evento: captura cliques em .room-card mesmo após
  // eles serem criados dinamicamente pelo salas.js.
  container.addEventListener('click', (evento) => {

    const card = evento.target.closest('.room-card');

    if (!card) {
      return;
    }

    // Salas indisponíveis não avançam.
    if (card.dataset.status === 'indisponivel') {
      evento.preventDefault();
      return;
    }

    const salaId = card.dataset.salaId;
    const salaNome = card.dataset.sala;

    if (!salaId) {
      return;
    }

    evento.preventDefault();

    // Marca visualmente o card selecionado.
    const cards = document.querySelectorAll('.room-card');
    cards.forEach((c) => c.classList.remove('selected'));
    card.classList.add('selected');

    // Guarda a escolha no sessionStorage para o passo 02.
    sessionStorage.setItem(
      'salaSelecionada',
      JSON.stringify({
        id: parseInt(salaId, 10),
        nome: salaNome || '',
        categoria: 'Gabinete'
      })
    );

    window.location.href = '/passo2_reserva_prof';
  });

});
