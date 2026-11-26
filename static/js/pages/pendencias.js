// Tela do coordenador: lista pedidos de troca de senha e decide.
//
// A senha nova nunca aparece aqui — o servidor guardou apenas o hash
// bcrypt na tabela pendencias_senhas. Esta tela mostra o id do pedido e
// o id do usuário e chama as rotas que aplicam (ou descartam) o hash.

import {
  listarPendencias,
  aceitarPendencia,
  recusarPendencia
} from '../api.js';

const lista = document.getElementById('listaPendencias');
const vazia = document.getElementById('listaVazia');
const erro = document.getElementById('listaErro');
const erroTexto = document.getElementById('listaErroTexto');

// Formata a data ISO devolvida pelo banco para algo legível na tela.
function formatarData(valor) {
  if (!valor) return 'data não informada';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleString('pt-BR');
}

async function carregar() {
  if (!lista) return;

  try {
    const pedidos = await listarPendencias();

    lista.replaceChildren();
    if (vazia) vazia.style.display = pedidos.length ? 'none' : 'block';
    if (erro) erro.style.display = 'none';

    for (const pedido of pedidos) {
      const cartao = document.createElement('article');
      cartao.className = 'adm-card';

      // textContent (em vez de innerHTML) impede que qualquer dado vindo
      // do banco seja interpretado como HTML.
      const titulo = document.createElement('h3');
      titulo.textContent = `Pedido #${pedido.id} — usuário #${pedido.usuario_id}`;

      const data = document.createElement('p');
      data.textContent = `Solicitado em ${formatarData(pedido.solicitado_em)}`;

      const botoes = document.createElement('div');
      botoes.className = 'adm-acoes';

      const aceitar = document.createElement('button');
      aceitar.type = 'button';
      aceitar.textContent = 'Aprovar';
      aceitar.addEventListener('click', () => decidir(pedido.id, 'aceitar'));

      const recusar = document.createElement('button');
      recusar.type = 'button';
      recusar.textContent = 'Recusar';
      recusar.addEventListener('click', () => decidir(pedido.id, 'recusar'));

      botoes.append(aceitar, recusar);
      cartao.append(titulo, data, botoes);
      lista.append(cartao);
    }
  } catch (excecao) {
    console.error('Erro ao carregar pendências:', excecao);
    if (lista) lista.replaceChildren();
    if (erro) erro.style.display = 'block';
    if (erroTexto) erroTexto.textContent = excecao.message || 'Não foi possível carregar os pedidos.';
  }
}

// "acao" é aceitar/recusar; o mapeamento evita construir a URL com
// texto livre vindo da tela.
async function decidir(id, acao) {
  const funcao = acao === 'aceitar' ? aceitarPendencia : recusarPendencia;

  try {
    await funcao(id);
    await carregar();
  } catch (excecao) {
    if (erroTexto) erroTexto.textContent = excecao.message || 'Não foi possível decidir o pedido.';
    if (erro) erro.style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', carregar);
