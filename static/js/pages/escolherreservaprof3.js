document.addEventListener('DOMContentLoaded', () => {

      // ========================================================
      // MENU DE PERFIL
      // ========================================================

      

      

      

      // ========================================================
      // BARRA DE PESQUISA
      // ========================================================

      

      const itemsToSearch =
        document.querySelectorAll('.searchable');

      

      // ========================================================
      // SELEÇÃO DOS GABINETES
      // ========================================================

      const roomCards =
        document.querySelectorAll('.room-card');

      roomCards.forEach((card) => {

        card.addEventListener('click', (e) => {

          // Gabinete negado não pode ser selecionado
          if (card.dataset.status === 'negado') {

            e.preventDefault();

            return;

          }

          // Remove seleção dos outros gabinetes
          roomCards.forEach((c) => {

            c.classList.remove('selected');

          });

          // Seleciona o gabinete atual
          card.classList.add('selected');

          // Guarda o gabinete selecionado
          sessionStorage.setItem(
            'salaSelecionada',
            card.dataset.sala || ''
          );

          // Impede o href="#"
          e.preventDefault();

          // Redireciona para o Passo 02
          setTimeout(() => {

            window.location.href =
              '/passo2_reserva_prof';

          }, 300);

        });

      });

      // ========================================================
      

      

      

      

    });
