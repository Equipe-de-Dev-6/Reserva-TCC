document.addEventListener('DOMContentLoaded', () => {

      
      

      

      
      
      

      

      // Troca o icone e o titulo do cartao de categoria pelo que foi
      // escolhido no passo 01 (laboratorio, gabinete ou sala). Sem
      // esta chamada a tela mostra o icone e o titulo de sala mesmo
      // quando a reserva e de laboratorio ou de gabinete.
      ReservasApp.pintarCategoria();

      const reservaForm = document.getElementById('reservaForm');

      if (reservaForm) {

        reservaForm.addEventListener('submit', (e) => {

          e.preventDefault();

          if (!reservaForm.checkValidity()) {

            reservaForm.reportValidity();

            return;
          }

          // Guarda os dados preenchidos para serem confirmados no Passo 03.
          ReservasApp.stageReserva(reservaForm);

          window.location.href = '/passo3_reserva_prof';

        });

      }

    });
