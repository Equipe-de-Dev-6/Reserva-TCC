/**
 * salas.js
 *
 * Carrega as salas vindas da API e monta os cards de escolha
 * nas telas de Salas, Laboratórios e Carrinhos.
 *
 * Os cards antes eram escritos à mão no HTML. Agora eles são
 * gerados a partir de GET /salas, usando o "contexto" devolvido
 * pela API (setor, quantidade de alunos, equipamentos e descrição).
 *
 * A API já devolve somente as salas reserváveis, porque o filtro
 * acontece na consulta ao banco. Aqui só resta separar cada sala
 * entre a tela de Salas e a de Laboratórios.
 */

import { listarSalas, buscarSala } from '/js/api.js';

// ============================================================
// CLASSIFICAÇÃO
// ============================================================

/**
 * Em qual tela a sala aparece.
 *
 * A classificação é feita no servidor: o campo "categoria" de
 * GET /salas já vem decidido pelo app.py, a partir da descrição
 * cadastrada ("Laboratório de informática" vai para a tela de
 * laboratórios, "Gabinete..." para a de gabinetes).
 *
 * Antes cada tela repetia essa conta por conta própria, e uma sala que
 * mudasse de categoria Depending umas telas e outras não.
 */
function categorizar(sala) {

  return sala.categoria || 'sala';
}

// ============================================================
// RENDERIZAÇÃO
// ============================================================

/**
 * Monta o título do card no padrão "nome - descrição".
 *
 * Quando a sala não tem descrição cadastrada, fica apenas
 * o nome, para não sobrar o separador no fim do título.
 */
function tituloDaSala(sala) {

  const descricao = (sala.contexto || {}).descricao;

  return descricao
    ? `${sala.nome} - ${descricao}`
    : sala.nome;
}

/**
 * Monta a linha abaixo do título, sempre com a mesma forma:
 * "32 lugares".
 *
 * Salas sem capacidade informada (o banco traz "Não informado" ou
 * o campo vazio) ficam sem essa linha, em vez de mostrar um texto
 *ivariado que quebraria o padrão.
 */
function detalheDaSala(sala) {

  const quantidade = (sala.contexto || {}).quantidade_alunos;

  return quantidade
    ? `${quantidade} lugares`
    : '';
}

/**
 * Cria o card de uma sala.
 */
function criarCard(sala, proximoPasso) {

  const contexto = sala.contexto || {};

  const card = document.createElement('a');

  card.href = '#';
  card.className = 'room-card searchable';
  card.dataset.salaId = String(sala.id);
  card.dataset.sala = sala.nome;
  card.dataset.status = sala.disponibilidade ? 'disponivel' : 'indisponivel';

  // ------------------
  // Lado esquerdo
  // ------------------

  const left = document.createElement('div');
  left.className = 'room-left';

  const thumb = document.createElement('div');
  thumb.className = 'room-thumb';

  const imagem = document.createElement('img');
  imagem.src = '/assets/icons/image.png';
  imagem.alt = 'Sala';
  imagem.width = 20;
  imagem.height = 20;

  thumb.appendChild(imagem);

  const info = document.createElement('div');
  info.className = 'room-info';

  const titulo = document.createElement('h4');
  titulo.textContent = tituloDaSala(sala);

  info.appendChild(titulo);

  const detalhe = detalheDaSala(sala);

  if (detalhe) {

    const linha = document.createElement('p');
    linha.textContent = detalhe;

    info.appendChild(linha);

  }

  left.appendChild(thumb);
  left.appendChild(info);

  // ------------------
  // Selo de status
  // ------------------

  const selo = document.createElement('span');

  selo.className = sala.disponibilidade
    ? 'status-badge status-available'
    : 'status-badge status-denied';

  selo.textContent = sala.disponibilidade
    ? 'Disponível'
    : 'Indisponível';

  card.appendChild(left);
  card.appendChild(selo);

  // ------------------
  // Seleção
  // ------------------

  card.addEventListener('click', (evento) => {

    // Salas indisponíveis não avançam para o passo seguinte.
    if (!sala.disponibilidade) {

      evento.preventDefault();
      return;

    }

    const cards = document.querySelectorAll('.room-card');

    cards.forEach((c) => c.classList.remove('selected'));

    card.classList.add('selected');

    evento.preventDefault();

    // Confirma na API antes de seguir, para o passo seguinte
    // trabalhar sempre com o dado mais recente do banco.
    selecionarSala(sala.id, proximoPasso);

  });

  return card;
}

/**
 * Busca a sala na API, guarda a escolha e abre o próximo passo.
 */
async function selecionarSala(salaId, proximoPasso) {

  try {

    const sala = await buscarSala(salaId);

    // A categoria vem pronta do servidor. O "reservas.js" usa esse
    // rótulo para classificar a reserva, sem precisar repetir a conta
    // a partir do texto da sala.
    sessionStorage.setItem(
      'salaSelecionada',
      JSON.stringify({
        id: sala.id,
        nome: sala.nome,
        contexto: sala.contexto,
        categoria: sala.categoriaRotulo || 'Sala'
      })
    );

  } catch (erro) {

    console.error('Erro ao buscar a sala:', erro);

  }

  window.location.href = proximoPasso;
}

/**
 * Mostra uma mensagem quando a lista não traz nenhuma sala.
 */
function mostrarVazio(container, mensagem) {

  const aviso = document.createElement('p');

  aviso.className = 'rooms-empty';
  aviso.textContent = mensagem;

  container.appendChild(aviso);
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

/**
 * Busca as salas na API e monta a lista da categoria da tela.
 *
 * A categoria e o próximo passo são lidos do atributo
 * data-categoria e data-proximo da lista de salas.
 *
 * As telas que ainda não têm cadastro (carrinhos e equipamentos)
 * não usam data-lista-salas e por isso são ignoradas aqui, sem
 * chamar a API.
 */
async function initSalas() {

  const container = document.querySelector('[data-lista-salas]');

  if (!container) {
    return;
  }

  const categoria = container.dataset.categoria;
  const proximoPasso = container.dataset.proximo;

  try {

    const salas = await listarSalas();

    // Salas que não são reserváveis não são exibidas.
    const daCategoria = salas.filter((sala) => categorizar(sala) === categoria);

    if (!daCategoria.length) {

      mostrarVazio(
        container,
        'Nenhuma sala cadastrada nesta categoria.'
      );

      return;
    }

    daCategoria.forEach((sala) => {

      container.appendChild(
        criarCard(sala, proximoPasso)
      );

    });

  } catch (erro) {

    console.error('Erro ao carregar as salas:', erro);

    mostrarVazio(
      container,
      'Não foi possível carregar as salas.'
    );

  }
}

if (document.readyState === 'loading') {

  document.addEventListener(
    'DOMContentLoaded',
    () => {
        initSalas();
    }
  );

} else {

  initSalas();

}
