// Tela pública "esqueci minha senha".
//
// O envio cria uma pendência no banco com o HASH da nova senha; a troca
// real só acontece quando o coordenador aprova em /pendencias_adm.
// A resposta da API é { id } — não há campo "status" para conferir:
// pedir() já levanta erro quando a requisição falha.

import { solicitarAlteracaoSenha } from './api.js';

const formulario = document.getElementById('form-esqueceu-senha');
const aviso = document.getElementById('aviso');
const botao = document.getElementById('btn-solicitar');

function mostrarAviso(mensagem, tipo) {
  if (!aviso) return;
  aviso.textContent = mensagem || '';
  aviso.className = tipo ? `aviso visivel ${tipo}` : 'aviso';
}

async function solicitar(event) {
  event.preventDefault();

  if (!formulario || !botao) return;

  const email = document.getElementById('email').value.trim().toLowerCase();
  const senha = document.getElementById('senha').value;
  const confirmarSenha = document.getElementById('confirmar-senha').value;

  // O backend confere de novo (inclusive o limite de 72 bytes do
  // bcrypt). Aqui a checagem só evita uma ida ao servidor à toa.
  if (senha.length < 6) {
    mostrarAviso('A nova senha deve ter pelo menos 6 caracteres.', 'erro');
    return;
  }

  if (senha !== confirmarSenha) {
    mostrarAviso('As senhas não coincidem.', 'erro');
    return;
  }

  botao.disabled = true;
  mostrarAviso('');

  try {
    const dados = await solicitarAlteracaoSenha(email, senha);

    formulario.reset();
    mostrarAviso(
      `Solicitação registrada (pedido #${dados.id}). Aguarde a aprovação do coordenador.`,
      'sucesso'
    );
  } catch (erro) {
    mostrarAviso(erro.message || 'Não foi possível enviar a solicitação.', 'erro');
  } finally {
    botao.disabled = false;
  }
}

if (formulario) {
  formulario.addEventListener('submit', solicitar);
}
