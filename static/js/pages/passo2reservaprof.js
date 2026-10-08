document.addEventListener('DOMContentLoaded', () => {

      
      

      

      
      
      

      

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
