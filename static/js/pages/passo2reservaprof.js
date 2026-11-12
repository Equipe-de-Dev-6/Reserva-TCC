document.addEventListener('DOMContentLoaded', () => {

      
      

      

      
      
      

      

      // Troca o icone e o titulo do cartao de categoria pelo que foi
      // escolhido no passo 01 (laboratorio, gabinete ou sala). Sem
      // esta chamada a tela mostra o icone e o titulo de sala mesmo
      // quando a reserva e de laboratorio ou de gabinete.
      ReservasApp.pintarCategoria();

      // ------------------------------------------------------
      // NÃO PERMITE ESCOLHER UMA DATA QUE JÁ PASSOU
      // ------------------------------------------------------
      // O backend também recusa datas passadas. Aqui a trava é
      // feita antes, para o professor não avançar no fluxo com uma
      // data inválida e só descobrir o erro no final.
      const campoData = document.getElementById('data');

      if (campoData) {

        campoData.min = ReservasApp.todayISO();

      }

      const reservaForm = document.getElementById('reservaForm');

      if (reservaForm) {

        reservaForm.addEventListener('submit', (e) => {

          e.preventDefault();

          if (!reservaForm.checkValidity()) {

            reservaForm.reportValidity();

            return;
          }

          if (campoData && campoData.value < ReservasApp.todayISO()) {

            alert('Não é possível agendar em dias que já passaram. Escolha a data de hoje ou uma data futura.');

            campoData.focus();

            return;
          }

          // Guarda os dados preenchidos para serem confirmados no Passo 03.
          ReservasApp.stageReserva(reservaForm);

          window.location.href = '/passo3_reserva_prof';

        });

      }

    });
