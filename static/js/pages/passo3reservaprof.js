document.addEventListener('DOMContentLoaded', () => {

  // Confirma a reserva rascunhada no Passo 02
  // e adiciona à lista definitiva de reservas
  // com status "Aguardando".

  // O "commitStagedReserva" apaga o rascunho, então o ícone e o
  // título devem ser pintados antes: é o sessionStorage que guarda
  // a categoria que os dois leem.
  ReservasApp.pintarCategoria();

  const reserva = ReservasApp.commitStagedReserva();

  if (!reserva) {
    // Não há rascunho: o professor chegou aqui sem passar pelo passo 02.
    // Volta para a tela de escolha para não perder os dados preenchidos.
    alert('Não há dados de reserva para confirmar. Volte e preencha os detalhes da reserva.');
    window.location.href = '/escolher_reserva_salas';
    return;
  }

  // =====================================================
  // DROPDOWN DO USUÁRIO
  // =====================================================

});
