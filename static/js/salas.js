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
 * A tabela "salas" não tem coluna de categoria, então a separação
 * entre as telas é feita aqui.
 */

import { listarSalas, buscarSala } from '/js/api.js';


/**
 * Palavras usadas para classificar cada sala.
 *
 * A ordem importa: as salas que não servem para reserva
 * (portas, depósitos, cozinhas) são descartadas primeiro, para
 * não aparecerem como salas de aula.
 */
/**
 * Salas que fazem parte das telas de reserva.
 *
 * A lista foi levantada a partir do cadastro do campus e contém
 * apenas as salas e laboratórios usados por professores. O que
 * ficou de fora (portas, depósitos, cozinhas, cilindradas de gás)
 * não é reservável e por isso não aparece.
 *
 * A seleção é feita pelo "id" e não pelo nome, porque existem
 * salas com o mesmo nome e ids diferentes (as duas C24, por exemplo).
 *
 * Para incluir ou remover uma sala, ajuste apenas esta lista.
 */
const SALAS_RESERVAVEIS = [
  1,   2,   3,   4,   5,   6,   7,   8,   9,   10,  11,  12,
  13,  14,  15,  18,  19,  20,  24,  25,  28,  31,  35,  56,
  57,  58,  59,  60,  61,  62,  63,  64,  65,  66,  67,  69,
  70,  71,  72,  75,  77,  78,  79,  80,  81,  89,  90,  91
];


/**
 * Uma sala é laboratório quando a própria descrição diz
 * "Laboratório". Salas de prática sem essa palavra no texto
 * (Sala de TI, Metrologia, salas de eletrônica) continuam
 * na lista de Salas.
 */
const PALAVRA_LABORATORIO = 'laborat';


// ============================================================
// CLASSIFICAÇÃO
// ============================================================

/**
 * Remove os acentos, para que a comparação funcione tanto com
 * "eletrônica" quanto com "eletronica".
 */
function semAcento(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}


/**
 * Monta o texto usado para decidir a categoria da sala.
 */
function textoDaSala(sala) {

  const contexto = sala.contexto || {};

  const partes = {
    nome: semAcento(String(sala.nome || '').toLowerCase()),
    descricao: semAcento(String(contexto.descricao || '').toLowerCase()),
    setor: semAcento(String(contexto.setor || '').toLowerCase()),
    equipamentos: semAcento(
      (contexto.equipamentos || []).join(' ').toLowerCase()
    )
  };

  partes.tudo = [
    partes.nome,
    partes.descricao,
    partes.setor,
    partes.equipamentos
  ]
    .filter(Boolean)
    .join(' ');

  return partes;
}


/**
 * Termos curtos que precisam ser palavra inteira.
 *
 * Procurados como parte de qualquer texto, eles dariam falso
 * positivo: "ti" existe dentro de "prática" e "mdi" pode
 * fazer parte do nome de um equipamento.
 */
const TERMOS_INTEIROS = new Set(['ti', 'mdi']);


/**
 * Procura um termo dentro do texto da sala.
 *
 * A maior parte dos termos è procurada como começo de palavra
 * ("laborat" em "laboratório"), porque assim as palavras que
 * não terminaram com a vogal ainda são encontradas. Os termos
 * de TERMOS_INTEIROS exigem início e fim de palavra.
 */
function contemTermo(texto, termo) {

  if (!TERMOS_INTEIROS.has(termo)) {
    return texto.includes(termo);
  }

  const padrao = new RegExp(
    `(^|[^a-z0-9])${termo}([^a-z0-9]|$)`
  );

  return padrao.test(texto);
}


/**
 * Descobre em qual das três telas a sala deve aparecer.
 *
 * Retorna null quando a sala não é reservável, para que ela
 * não seja oferecida ao professor.
 */
function categorizar(sala) {

  // Fora da lista do levantamento, a sala não é exibida.
  if (!SALAS_RESERVAVEIS.includes(sala.id)) {
    return null;
  }

  const contexto = sala.contexto || {};

  const descricao = semAcento(
    String(contexto.descricao || '').toLowerCase()
  );

  return descricao.includes(PALAVRA_LABORATORIO)
    ? 'laboratorios'
    : 'salas';
}


// ============================================================
// RENDERIZAÇÃO
// ============================================================

/**
 * Escolhe a linha de detalhe exibida abaixo do nome da sala.
 */
function detalheDaSala(sala) {

  const contexto = sala.contexto || {};

  if (contexto.quantidade_alunos) {
    return `${contexto.quantidade_alunos} lugares`;
  }

  if (contexto.setor) {
    return contexto.setor;
  }

  if (contexto.descricao) {
    return contexto.descricao;
  }

  const equipamentos = contexto.equipamentos || [];

  if (equipamentos.length) {
    return `${equipamentos.length} equipamento(s)`;
  }

  return 'Sem informações cadastradas';
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
  titulo.textContent = contexto.descricao
    ? `${sala.nome} — ${contexto.descricao}`
    : sala.nome;

  const detalhe = document.createElement('p');
  detalhe.textContent = detalheDaSala(sala);

  info.appendChild(titulo);
  info.appendChild(detalhe);

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

    sessionStorage.setItem(
      'salaSelecionada',
      JSON.stringify({
        id: sala.id,
        nome: sala.nome,
        contexto: sala.contexto
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


/**
 * Filtra os cards pelo texto digitado na busca.
 *
 * Usa delegação de evento porque os cards são criados depois
 * que a página carrega.
 */
function initBusca() {

  const campo = document.getElementById('search-input');

  const lista = document.querySelector('[data-lista-salas]');

  if (!campo || !lista) {
    return;
  }

  campo.addEventListener('input', () => {

    const termo = campo.value
      .toLowerCase()
      .trim();

    lista
      .querySelectorAll('.room-card')
      .forEach((card) => {

        const texto = card.textContent.toLowerCase();

        card.style.display = texto.includes(termo)
          ? ''
          : 'none';

      });

  });

}


if (document.readyState === 'loading') {

  document.addEventListener(
    'DOMContentLoaded',
    () => {
      initBusca();
      initSalas();
    }
  );

} else {

  initBusca();
  initSalas();

}
