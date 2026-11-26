// ============================================================
// escolherreservaprof3.js — tela de escolha de gabinetes
// ============================================================
//
// Este arquivo não registra mais clique nos cards.
//
// O motivo: o salas.js já cria cada card com o próprio listener e,
// antes de navegar, busca a sala na API (selecionarSala()). O listener
// duplicado daqui gravava categoria fixa "Gabinete", sobrescrevia o
// contexto vindo do servidor e chamava window.location duas vezes.
//
// A tela continua carregando este arquivo para manter o histórico dos
// scripts da página, mas todo o comportamento está em salas.js.
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
    // Gabinetes ainda não têm cadastro próprio, então categoria é
    // gravada como 'Gabinete' (texto fixo, sem id de banco).
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
