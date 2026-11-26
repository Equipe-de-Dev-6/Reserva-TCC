// ============================================================
// API
// ============================================================
//
// Comunicação com o backend. Todas as funções devolvem os dados já
// convertidos (json) e levantam um erro quando a rota responde com
// falha, para que a tela trate o erro em um lugar só.
//
// As rotas chamadas aqui são as que existem no app.py. Endpoint que
// não existe voltaria 404 em silêncio nas telas, por isso esta lista
// acompanha a API de perto.
// ============================================================


// ------------------------------------------------------------
// AUXILIARES
// ------------------------------------------------------------

/**
 * Executa a requisição e devolve o corpo em json.
 *
 * A mensagem do erro vem do campo "detail" do FastAPI quando existe,
 * que é onde a rota explica o que aconteceu ("Sala não encontrada",
 * "E-mail ou senha inválidos"). Sem isso, a tela mostraria sempre
 * "erro na requisição", que não ajuda ninguém a entender.
 *
 * Fluxo:
 * 1. Faz o fetch com as opções dadas.
 * 2. Tenta ler o corpo como JSON (se falhar, fica null).
 * 3. Se a resposta não foi ok (status >= 400), monta um Error com o
 *    detalhe extraído do corpo e lança.
 * 4. Se foi ok, devolve o corpo já convertido.
 */
async function pedir(url, opcoes = {}) {

  const resposta = await fetch(url, opcoes);

  let corpo = null;

  try {

    corpo = await resposta.json();

  } catch (erro) {

    // Resposta sem corpo (204, ou página de erro do servidor).
    corpo = null;

  }

  if (!resposta.ok) {

    const detalhe =
      corpo && (corpo.detail || corpo.erro || corpo.mensagem);

    const erro = new Error(
      typeof detalhe === 'string'
        ? detalhe
        : `Falha na requisição (${resposta.status}).`
    );

    erro.status = resposta.status;
    erro.detalhe = corpo;

    throw erro;

  }

  return corpo;

}


/**
 * Monta o corpo de uma requisição JSON.
 */
function corpoJson(dados) {

  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  };

}


// ============================================================
// SESSÃO
// ============================================================

/**
 * Dados do usuário autenticado.
 *
 * A rota é /usuario_logado, com sublinhado: as telas que usavam o
 * hífen recebiam 404 e caíam no "Usuário" genérico do cabeçalho.
 */
export async function usuarioLogado() {

  return pedir('/usuario_logado');

}


// ============================================================
// LOGIN
// ============================================================

/**
 * Autentica e devolve { cargo: 'prof' | 'coordenador' }.
 */
export async function entrar(email, senha) {

  const dados = new FormData();

  dados.append('email', email);
  dados.append('senha', senha);

  return pedir('/login', {
    method: 'POST',
    body: dados
  });

}


// ============================================================
// SALAS
// ============================================================

/**
 * Salas reserváveis (as que aparecem nas telas de reserva).
 */
export async function listarSalas() {

  return pedir('/salas');

}

/**
 * Todas as salas, inclusive as que não são reserváveis.
 * Restrito ao coordenador.
 */
export async function listarSalasAdmin() {

  return pedir('/admin/salas');

}

export async function buscarSala(id) {

  return pedir(`/salas/${id}`);

}

export async function cadastrarSala(dados) {

  return pedir('/salas', {
    method: 'POST',
    ...corpoJson(dados)
  });

}

export async function atualizarSala(id, dados) {

  return pedir(`/salas/${id}`, {
    method: 'PUT',
    ...corpoJson(dados)
  });

}

export async function excluirSala(id) {

  return pedir(`/salas/${id}`, {
    method: 'DELETE'
  });

}


// ============================================================
// CARRINHOS
// ============================================================

export async function listarCarrinhos() {

  return pedir('/carrinhos');

}


// ============================================================
// USUÁRIOS
// ============================================================

/**
 * Lista de usuários, para a tela de professores. Restrito ao
 * coordenador, e a resposta nunca traz o hash da senha.
 */
export async function listarUsuarios() {

  return pedir('/usuarios');

}

export async function cadastrarUsuario(dados) {

  return pedir('/usuarios', {
    method: 'POST',
    ...corpoJson(dados)
  });

}

export async function atualizarUsuario(id, dados) {

  // Rota do coordenador. A tela do professor usa atualizarMe(), que
  // retira o cargo e usa a sessão como identidade.
  return pedir(`/usuarios/${id}`, {
    method: 'PUT',
    ...corpoJson(dados)
  });

}

/**
 * Atualiza nome e/ou e-mail do próprio usuário.
 *
 * O id não vai na URL: vem da sessão, então o professor não precisa
 * saber (nem pode trocar) o id de outra conta.
 */
export async function atualizarMe(dados) {

  return pedir('/usuarios/me', {
    method: 'PUT',
    ...corpoJson(dados)
  });

}

export async function excluirUsuario(id) {

  return pedir(`/usuarios/${id}`, {
    method: 'DELETE'
  });

}


// ============================================================
// RESERVAS
// ============================================================

/**
 * Reservas. Sem argumento, o backend devolve as do professor
 * logado; o coordenador recebe as de todo mundo. O filtro de
 * status é opcional ("aguardando", "aprovada", "negada",
 * "cancelada") e casa com as abas da tela de aprovação.
 */
export async function listarReservas(status) {

  const consulta = status
    ? `?status=${encodeURIComponent(status)}`
    : '';

  return pedir(`/reservas${consulta}`);

}

export async function criarReserva(dados) {

  return pedir('/reservas', {
    method: 'POST',
    ...corpoJson(dados)
  });

}

/**
 * Aprova, recusa ou cancela uma reserva.
 *
 * "aprovada" e "negada" são exclusivas do coordenador; o professor
 * só consegue cancelar o próprio pedido.
 */
export async function decidirReserva(id, decisao) {

  return pedir(`/reservas/${id}/decisao`, {
    method: 'PATCH',
    ...corpoJson({ decisao: decisao })
  });

}


export async function alterarSenhaUsuario(id, senha) {
  return pedir(`/usuarios/${id}/senha`, {
    method: 'PUT',
    ...corpoJson({ senha })
  });
}

// ============================================================
// REDEFINIÇÃO DE SENHA
// ============================================================

/**
 * Solicita redefinição de senha para o coordenador aprovar.
 *
 * A rota devolve só `{ id }`: o status "pendente" é um detalhe do
 * banco, não do contrato HTTP. Qualquer falha já levanta erro em
 * pedir(), então a tela não precisa adivinhar status.
 */
export async function solicitarAlteracaoSenha(email, senha) {

  const dados = new FormData();
  dados.append('email', email);
  dados.append('senha', senha);

  return pedir('/senha/solicitar', {
    method: 'POST',
    body: dados
  });

}


// ============================================================
// PEDIDOS DE SENHA (COORDENADOR)
// ============================================================

/** Lista pedidos aguardando decisão do coordenador. */
export async function listarPendencias() {

  return pedir('/pendencias');

}

/** Aplica a nova senha e fecha o pedido como aprovado. */
export async function aceitarPendencia(id) {

  return pedir(`/pendencias/${id}/aceitar`, { method: 'POST' });

}

/** Fecha o pedido como negado, sem mexer na senha do usuário. */
export async function recusarPendencia(id) {

  return pedir(`/pendencias/${id}/recusar`, { method: 'POST' });

}


// ============================================================
// NOTIFICAÇÕES
// ============================================================
//
// Antes a tela lia só o cache local de reservas.js, que não sabia das
// notificações gravadas no banco. Estas funções falam direto com a API.

/** Notificações do usuário da sessão, mais recentes primeiro. */
export async function listarNotificacoes() {

  return pedir('/api/notificacoes');

}

/** Cria notificação para o usuário da sessão. */
export async function criarNotificacao(titulo, mensagem) {

  return pedir('/api/notificacoes', {
    method: 'POST',
    ...corpoJson({ titulo, mensagem })
  });

}

/** Marca uma notificação do próprio usuário como lida. */
export async function marcarNotificacaoLida(id) {

  return pedir(`/api/notificacoes/${id}/ler`, { method: 'PATCH' });

}

/** Exclui uma notificação do próprio usuário. */
export async function excluirNotificacao(id) {

  return pedir(`/api/notificacoes/${id}`, { method: 'DELETE' });

}
